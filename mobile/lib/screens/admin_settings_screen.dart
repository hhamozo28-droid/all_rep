import 'package:flutter/material.dart';

import '../api.dart';
import '../strings.dart';
import '../theme.dart';

/// Administrator-only controls, mirroring the web /admin settings panel.
class AdminSettingsScreen extends StatefulWidget {
  const AdminSettingsScreen({super.key});

  @override
  State<AdminSettingsScreen> createState() => _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends State<AdminSettingsScreen> {
  final _password = TextEditingController();
  final _welcome = TextEditingController();
  final _hours = TextEditingController(text: '24');
  final _bulkLimit = TextEditingController(text: '6');

  bool _busy = false;
  bool _authorized = false;
  bool _paused = false;
  bool _autoApprove = false;
  String _theme = 'default';
  String _font = 'default';
  String _message = '';

  @override
  void initState() {
    super.initState();
    _tryLoad();
  }

  @override
  void dispose() {
    _password.dispose();
    _welcome.dispose();
    _hours.dispose();
    _bulkLimit.dispose();
    super.dispose();
  }

  Future<void> _tryLoad() async {
    setState(() => _busy = true);
    try {
      final data = await Api.instance.adminSettings();
      if (!mounted) return;
      _apply(data);
      setState(() => _authorized = true);
    } on ApiException catch (e) {
      if (e.status == 401 && mounted) setState(() => _authorized = false);
    } catch (_) {
      if (mounted) setState(() => _message = networkError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _apply(Map<String, dynamic> data) {
    _paused = data['downloadsPaused'] == true;
    _autoApprove = data['autoApprove'] == true;
    _hours.text = (data['autoApproveAfterHours'] ?? 24).toString();
    _welcome.text = (data['welcomeMessage'] as String?) ?? '';
    final t = data['theme'] as String?;
    if (t != null && ['default', 'white-black', 'red-purple', 'brown-shiny'].contains(t)) {
      _theme = t;
    }
    final f = data['fontStyle'] as String?;
    if (f != null && ['default', 'compact', 'large', 'expanded'].contains(f)) {
      _font = f;
    }
  }

  Future<void> _login() async {
    if (_password.text.isEmpty) return;
    setState(() => _busy = true);
    try {
      await Api.instance.adminLogin(_password.text.trim());
      _password.clear();
      await _tryLoad();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _message = e.code == 'wrong-password' ? wrongCredentials : networkError);
    } catch (_) {
      if (mounted) setState(() => _message = networkError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await Api.instance.saveAdminSettings({
        'downloadsPaused': _paused,
        'autoApprove': _autoApprove,
        'autoApproveAfterHours': int.tryParse(_hours.text) ?? 24,
        'welcomeMessage': _welcome.text,
        'theme': _theme,
        'fontStyle': _font,
      });
      if (!mounted) return;
      setState(() => _message = settingsSaved);
    } on ApiException catch (e) {
      if (mounted) setState(() => _message = e.status == 401 ? adminOnlyHint : networkError);
    } catch (_) {
      if (mounted) setState(() => _message = networkError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _applyLimit() async {
    final limit = int.tryParse(_bulkLimit.text);
    if (limit == null || limit < 0 || limit > 1000) return;
    setState(() => _busy = true);
    try {
      final affected = await Api.instance.applyAdminBulkLimit(limit);
      if (!mounted) return;
      setState(() => _message = '$bulkLimitDone: $affected');
    } on ApiException catch (e) {
      if (mounted) setState(() => _message = e.status == 401 ? adminOnlyHint : networkError);
    } catch (_) {
      if (mounted) setState(() => _message = networkError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text(adminSettingsTitle)),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!_authorized) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(adminOnlyHint, style: theme.textTheme.bodySmall),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _password,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: adminPassword,
                            prefixIcon: Icon(Icons.admin_panel_settings_outlined),
                          ),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _busy ? null : _login,
                          child: const Text(adminSignIn),
                        ),
                      ],
                    ),
                  ),
                ),
              ] else ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SwitchListTile(
                          value: _paused,
                          onChanged: (v) => setState(() => _paused = v),
                          title: const Text(pauseDownloads),
                          activeColor: AppTheme.primary,
                        ),
                        SwitchListTile(
                          value: _autoApprove,
                          onChanged: (v) => setState(() => _autoApprove = v),
                          title: const Text(autoApprove),
                          activeColor: AppTheme.primary,
                        ),
                        TextField(
                          controller: _hours,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: autoApproveHours),
                        ),
                        const SizedBox(height: 14),
                        TextField(
                          controller: _welcome,
                          maxLines: 3,
                          decoration: const InputDecoration(labelText: welcomeLabel),
                        ),
                        const SizedBox(height: 14),
                        DropdownButtonFormField<String>(
                          value: _theme,
                          decoration: const InputDecoration(labelText: themeLabel),
                          items: const [
                            DropdownMenuItem(value: 'default', child: Text(themeDefault)),
                            DropdownMenuItem(value: 'white-black', child: Text(themeWhiteBlack)),
                            DropdownMenuItem(value: 'red-purple', child: Text(themeRedPurple)),
                            DropdownMenuItem(value: 'brown-shiny', child: Text(themeBrownShiny)),
                          ],
                          onChanged: (v) => setState(() => _theme = v ?? 'default'),
                        ),
                        const SizedBox(height: 14),
                        DropdownButtonFormField<String>(
                          value: _font,
                          decoration: const InputDecoration(labelText: fontLabel),
                          items: const [
                            DropdownMenuItem(value: 'default', child: Text(fontDefault)),
                            DropdownMenuItem(value: 'compact', child: Text(fontCompact)),
                            DropdownMenuItem(value: 'large', child: Text(fontLarge)),
                            DropdownMenuItem(value: 'expanded', child: Text(fontExpanded)),
                          ],
                          onChanged: (v) => setState(() => _font = v ?? 'default'),
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: _busy ? null : _save,
                          child: const Text(saveSettings),
                        ),
                      ],
                    ),
                  ),
                ),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          controller: _bulkLimit,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: bulkLimitLabel),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton(
                          onPressed: _busy ? null : _applyLimit,
                          child: const Text(bulkLimitApply),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              if (_message.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(_message, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.primary)),
              ],
              if (_busy) const Padding(padding: EdgeInsets.all(12), child: Center(child: CircularProgressIndicator())),
            ],
          ),
        ),
      ),
    );
  }
}
