import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import '../api.dart';
import '../deep_link.dart';
import '../strings.dart';

enum _AccountAction { logout, delete }

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onSignedOut});

  final VoidCallback onSignedOut;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);

  DownloadStatus? _status;
  bool _statusError = false;

  @override
  void initState() {
    super.initState();
    Api.instance.onUnauthorized = _handleUnauthorized;
    DeepLinkService.instance.register(_consumeDeepLink);
    _refreshStatus();
    _maybeShowWelcome().then((_) => _maybeShowNotification());
  }

  @override
  void dispose() {
    Api.instance.onUnauthorized = null;
    DeepLinkService.instance.unregister(_consumeDeepLink);
    _tabs.dispose();
    super.dispose();
  }

  void _handleUnauthorized() {
    if (!mounted) return;
    widget.onSignedOut();
  }

  Future<void> _refreshStatus() async {
    try {
      final status = await Api.instance.downloadStatus();
      if (!mounted) return;
      setState(() {
        _status = status;
        _statusError = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _statusError = true);
    }
  }

  Future<void> _maybeShowWelcome() async {
    try {
      final message = await Api.instance.unseenWelcome();
      if (message == null || !mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text(welcomeTitle),
          content: Text(message, style: const TextStyle(height: 1.6)),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text(ok),
            ),
          ],
        ),
      );
      await Api.instance.markWelcomeSeen();
    } catch (_) {
      // A welcome message is never worth blocking the app for.
    }
  }

  Future<void> _maybeShowNotification() async {
    try {
      final items = await Api.instance.notifications();
      for (final item in items) {
        if (item.read) continue;
        if (!mounted) return;
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text(notifications),
            content: Text(item.message, style: const TextStyle(height: 1.6)),
            actions: [
              FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text(close),
              ),
            ],
          ),
        );
        await Api.instance.markNotificationsRead();
        break;
      }
    } catch (_) {
      // Notifications must never block the catalog.
    }
  }

  void _showLimit() {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text(limitReached)));
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  /// A specialty link can resolve to a share page (gofile) instead of a file.
  /// Open it in the browser so the user can download there.
  Future<void> _openExternal(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null || !(await canLaunchUrl(uri))) {
      if (mounted) _snack(saveFailed);
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  /// Opens a shared deep link inside the app with the signed-in session.
  Future<void> _consumeDeepLink(String token) async {
    try {
      final directory = await getTemporaryDirectory();
      final downloaded = await Api.instance.deliverGrant(
        '/api/dl/$token',
        directory: directory,
      );
      final result = await OpenFilex.open(downloaded.path);
      if (!mounted) return;
      if (result.type != ResultType.done) {
        _snack('$saveFailed: ${result.message}');
      }
      await _refreshStatus();
    } on ExternalLinkException catch (e) {
      await _openExternal(e.url);
      await _refreshStatus();
    } on ApiException catch (e) {
      if (e.status == 401) {
        widget.onSignedOut();
        return;
      }
      if (!mounted) return;
      if (e.status == 410) {
        _snack(linkUsed);
      } else {
        _snack(networkError);
      }
      await _refreshStatus();
    } catch (_) {
      if (mounted) _snack(saveFailed);
    }
  }

  Future<void> _logout() async {
    await Api.instance.logout();
    if (!mounted) return;
    widget.onSignedOut();
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(deleteAccount),
        content:
            const Text(deleteAccountConfirm, style: TextStyle(height: 1.6)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text(cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(confirm),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await Api.instance.deleteAccount();
      if (!mounted) return;
      widget.onSignedOut();
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.status == 401) {
        widget.onSignedOut();
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(networkError)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(networkError)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text(appName),
        actions: [
          PopupMenuButton<_AccountAction>(
            tooltip: appName,
            icon: const Icon(Icons.account_circle_outlined),
            onSelected: (action) {
              switch (action) {
                case _AccountAction.logout:
                  _logout();
                  break;
                case _AccountAction.delete:
                  _deleteAccount();
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: _AccountAction.logout,
                child: Text(logout),
              ),
              PopupMenuItem(
                value: _AccountAction.delete,
                child: Text(
                  deleteAccount,
                  style: TextStyle(color: theme.colorScheme.error),
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          _buildBalance(theme),
          Material(
            color: Colors.white,
            child: TabBar(
              controller: _tabs,
              labelColor: theme.colorScheme.primary,
              unselectedLabelColor: theme.colorScheme.onSurfaceVariant,
              indicatorColor: theme.colorScheme.primary,
              tabs: const [
                Tab(text: specialtiesTab),
                Tab(text: guidesTab),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _SpecialtiesTab(
                  onConsumed: _refreshStatus,
                  onLimit: _showLimit,
                  exhausted: _status?.exhausted ?? false,
                ),
                _GuidesTab(
                  onConsumed: _refreshStatus,
                  onLimit: _showLimit,
                  exhausted: _status?.exhausted ?? false,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBalance(ThemeData theme) {
    final status = _status;
    final exhausted = status?.exhausted ?? false;

    String label;
    if (status == null) {
      label = _statusError ? error : loading;
    } else if (status.limit == null) {
      label = '$downloadsLeft: $unlimited';
    } else {
      final left = status.limit! - status.downloads;
      label = '$downloadsLeft: ${left < 0 ? 0 : left} / ${status.limit}';
    }

    return Material(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
        child: Row(
          children: [
            Icon(
              Icons.account_balance_wallet_outlined,
              size: 18,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: exhausted
                      ? theme.colorScheme.error
                      : theme.colorScheme.onSurface,
                ),
              ),
            ),
            if (exhausted)
              Flexible(
                child: Text(
                  limitReached,
                  textAlign: TextAlign.end,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.error,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            IconButton(
              tooltip: retry,
              visualDensity: VisualDensity.compact,
              onPressed: _refreshStatus,
              icon: const Icon(Icons.refresh, size: 20),
            ),
          ],
        ),
      ),
    );
  }
}

class _SpecialtiesTab extends StatefulWidget {
  const _SpecialtiesTab({
    required this.onConsumed,
    required this.onLimit,
    required this.exhausted,
  });

  final Future<void> Function() onConsumed;
  final VoidCallback onLimit;
  final bool exhausted;

  @override
  State<_SpecialtiesTab> createState() => _SpecialtiesTabState();
}

class _SpecialtiesTabState extends State<_SpecialtiesTab> {
  List<Specialty>? _items;
  bool _error = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool keepList = false}) async {
    if (!keepList) {
      setState(() {
        _items = null;
        _error = false;
      });
    }
    try {
      final items = await Api.instance.specialties();
      if (!mounted) return;
      setState(() {
        _items = items;
        _error = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = true);
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _openExternal(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null || !(await canLaunchUrl(uri))) {
      if (mounted) _snack(saveFailed);
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _openLink(Specialty item, int linkIndex) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final grantPath = await Api.instance.trackSpecialty(item.id, linkIndex);
      await widget.onConsumed();
      final directory = await getTemporaryDirectory();
      final downloaded = await Api.instance.deliverGrant(
        grantPath,
        directory: directory,
      );
      final result = await OpenFilex.open(downloaded.path);
      if (!mounted) return;
      if (result.type != ResultType.done) {
        _snack('$saveFailed: ${result.message}');
      }
    } on ExternalLinkException catch (e) {
      await _openExternal(e.url);
    } on ApiException catch (e) {
      if (e.status == 403) {
        widget.onLimit();
        await widget.onConsumed();
      } else if (e.status == 410) {
        _snack(linkUsed);
        await widget.onConsumed();
      } else {
        _snack(networkError);
      }
    } catch (_) {
      _snack(networkError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error && _items == null) {
      return _ErrorView(onRetry: () => _load());
    }
    final items = _items;
    if (items == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (items.isEmpty) {
      return _EmptyView(text: emptySpecialties, onRefresh: () => _load());
    }
    return RefreshIndicator(
      onRefresh: () => _load(keepList: true),
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) => _specialtyCard(items[index]),
      ),
    );
  }

  Widget _specialtyCard(Specialty item) {
    final theme = Theme.of(context);
    final links = item.links;
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              item.code,
              textDirection: TextDirection.ltr,
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.primary,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              item.name,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                _statChip(theme, '$modulesLabel: ${item.modules}'),
                _statChip(theme, '$lessonsLabel: ${item.lessons}'),
                _statChip(theme, '$filesLabel: ${item.filesCount}'),
              ],
            ),
            if (links.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _linkButton(item, links[0], sheetsLink),
                  if (links.length > 1) _linkButton(item, links[1], notesLink),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _statChip(ThemeData theme, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F1EE),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }

  Widget _linkButton(Specialty item, int linkIndex, String label) {
    return OutlinedButton.icon(
      onPressed:
          (_busy || widget.exhausted) ? null : () => _openLink(item, linkIndex),
      icon: const Icon(Icons.download_outlined, size: 18),
      label: Text(label),
    );
  }
}

class _GuidesTab extends StatefulWidget {
  const _GuidesTab({
    required this.onConsumed,
    required this.onLimit,
    required this.exhausted,
  });

  final Future<void> Function() onConsumed;
  final VoidCallback onLimit;
  final bool exhausted;

  @override
  State<_GuidesTab> createState() => _GuidesTabState();
}

class _GuidesTabState extends State<_GuidesTab> {
  List<Guide>? _items;
  bool _error = false;
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool keepList = false}) async {
    if (!keepList) {
      setState(() {
        _items = null;
        _error = false;
      });
    }
    try {
      final items = await Api.instance.guides();
      if (!mounted) return;
      setState(() {
        _items = items;
        _error = false;
      });
    } catch (e) {
      // Kept as a breadcrumb for device logs; the UI stays friendly.
      debugPrint('dordoc: guides load failed: $e');
      if (!mounted) return;
      setState(() => _error = true);
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _openExternal(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null || !(await canLaunchUrl(uri))) {
      if (mounted) _snack(saveFailed);
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  String _fileNameFor(Guide guide) {
    var stem = guide.fileName.trim();
    if (stem.toLowerCase().endsWith('.pdf')) {
      stem = stem.substring(0, stem.length - 4);
    }
    if (stem.isEmpty) stem = guide.title.trim();
    stem = stem.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
    if (stem.isEmpty) stem = 'guide';
    if (stem.length > 60) stem = stem.substring(0, 60);
    final prefix = guide.id.split('-').first;
    return '${prefix}_$stem.pdf';
  }

  Future<void> _handleGuide(Guide guide, {required bool download}) async {
    if (_busyId != null) return;
    setState(() => _busyId = guide.id);
    try {
      final grantPath = await Api.instance.trackGuide(guide.id, download: download);
      await widget.onConsumed();
      final directory = download
          ? await getApplicationDocumentsDirectory()
          : await getTemporaryDirectory();
      final downloaded = await Api.instance.deliverGrant(
        grantPath,
        directory: directory,
        preferredName: _fileNameFor(guide),
      );
      final result = await OpenFilex.open(downloaded.path);
      if (!mounted) return;
      if (result.type == ResultType.done) {
        if (download) _snack(fileSaved);
      } else {
        _snack('$saveFailed: ${result.message}');
      }
    } on ExternalLinkException catch (e) {
      await _openExternal(e.url);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.status == 403) {
        widget.onLimit();
        await widget.onConsumed();
      } else if (e.status == 410) {
        _snack(linkUsed);
        await widget.onConsumed();
      } else {
        _snack(networkError);
      }
    } catch (_) {
      if (mounted) _snack(saveFailed);
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error && _items == null) {
      return _ErrorView(onRetry: () => _load());
    }
    final items = _items;
    if (items == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (items.isEmpty) {
      return _EmptyView(text: emptyGuides, onRefresh: () => _load());
    }
    return RefreshIndicator(
      onRefresh: () => _load(keepList: true),
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) => _guideCard(items[index]),
      ),
    );
  }

  Widget _guideCard(Guide guide) {
    final theme = Theme.of(context);
    final busy = _busyId == guide.id;
    final disabled = _busyId != null || widget.exhausted;
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.picture_as_pdf_outlined,
                  color: theme.colorScheme.error,
                  size: 22,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    guide.title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${formatBytes(guide.size)} · ${guide.downloads}',
              textDirection: TextDirection.ltr,
              textAlign: TextAlign.right,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                FilledButton.icon(
                  onPressed: disabled
                      ? null
                      : () => _handleGuide(guide, download: false),
                  icon: busy
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.visibility_outlined, size: 18),
                  label: const Text(open),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: disabled
                      ? null
                      : () => _handleGuide(guide, download: true),
                  icon: const Icon(Icons.download_outlined, size: 18),
                  label: const Text(download),
                ),
              ],
            ),
            if (busy) ...[
              const SizedBox(height: 8),
              Text(
                preparingFile,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined, size: 42),
            const SizedBox(height: 12),
            const Text(error, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text(retry)),
          ],
        ),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView({required this.text, required this.onRefresh});

  final String text;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 80),
          const Icon(Icons.inbox_outlined, size: 42),
          const SizedBox(height: 12),
          Text(text, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

String formatBytes(int bytes) {
  if (bytes <= 0) return '—';
  final mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return '${mb.toStringAsFixed(mb >= 10 ? 0 : 1)} MB';
  }
  final kb = bytes / 1024;
  return '${kb.toStringAsFixed(0)} KB';
}
