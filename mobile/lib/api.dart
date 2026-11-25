import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Override for local testing:
/// `flutter run --dart-define=API_BASE=http://10.0.2.2:3000`
const String apiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'https://allrep-theta.vercel.app',
);

class ApiException implements Exception {
  ApiException(this.status, this.code);

  final int status;
  final String code;

  @override
  String toString() => 'ApiException($status, $code)';
}

class Specialty {
  Specialty({
    required this.id,
    required this.code,
    required this.name,
    required this.modules,
    required this.lessons,
    required this.filesCount,
    required this.links,
  });

  factory Specialty.fromJson(Map<String, dynamic> json) => Specialty(
        id: json['id'] as String? ?? '',
        code: json['code'] as String? ?? '',
        name: json['name'] as String? ?? '',
        modules: (json['modules'] as num?)?.toInt() ?? 0,
        lessons: (json['lessons'] as num?)?.toInt() ?? 0,
        filesCount: (json['filesCount'] as num?)?.toInt() ?? 0,
        links: ((json['links'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map((link) => (link['index'] as num?)?.toInt() ?? -1)
            .where((index) => index >= 0)
            .toList(),
      );

  final String id;
  final String code;
  final String name;
  final int modules;
  final int lessons;
  final int filesCount;
  /// Opaque link indexes. The server no longer exposes raw download URLs.
  final List<int> links;
}

class Guide {
  Guide({
    required this.id,
    required this.title,
    required this.fileName,
    required this.size,
    required this.downloads,
  });

  factory Guide.fromJson(Map<String, dynamic> json) => Guide(
        id: json['id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        fileName: json['fileName'] as String? ?? '',
        size: (json['size'] as num?)?.toInt() ?? 0,
        downloads: (json['downloads'] as num?)?.toInt() ?? 0,
      );

  final String id;
  final String title;
  final String fileName;
  final int size;
  final int downloads;
}

class AppNotification {
  AppNotification({required this.id, required this.message, required this.read});

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'] as String? ?? '',
        message: json['message'] as String? ?? '',
        read: json['read'] as bool? ?? false,
      );

  final String id;
  final String message;
  final bool read;
}

class DownloadStatus {
  DownloadStatus({required this.downloads, required this.limit});

  final int downloads;
  final int? limit;

  bool get exhausted => limit != null && downloads >= limit!;
}

/// A file delivered through a single-attempt capability link, already written
/// to disk so no signed/private URL ever appears in a browser or address bar.
class DownloadedFile {
  DownloadedFile({required this.path, required this.fileName});

  final String path;
  final String fileName;
}

/// Thin HTTP client for the existing Next.js API. The web app authenticates
/// with the `dl_session` cookie, so we store that cookie locally and send it
/// on every request (single-session-per-account is enforced server-side).
class Api {
  Api._();

  static final Api instance = Api._();

  /// Convert a server-relative capability path into a launchable URL.
  static String absolute(String path) => '$apiBase$path';

  static const _cookieKey = 'dl_session_cookie';
  static const _deviceKey = 'dl_device_id';
  final http.Client _client = http.Client();
  String? _cookie;
  String? _deviceId;

  Future<void> _loadCookie() async {
    if (_cookie != null) return;
    final prefs = await SharedPreferences.getInstance();
    _cookie = prefs.getString(_cookieKey);
  }

  /// Stable per-install identifier, mirroring the web's `dl_device_id`.
  Future<String> _loadDeviceId() async {
    if (_deviceId != null) return _deviceId!;
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_deviceKey);
    if (id == null || id.isEmpty) {
      final random = Random.secure();
      id = '${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}-'
          '${random.nextInt(1 << 32).toRadixString(36)}';
      await prefs.setString(_deviceKey, id);
    }
    _deviceId = id;
    return id;
  }

  Future<void> _saveCookie(http.Response response) async {
    final values = response.headersSplitValues['set-cookie'];
    if (values == null || values.isEmpty) return;
    for (final value in values) {
      final match = RegExp(r'(?:^|,\s*)(dl_session=[^;]+)').firstMatch(value);
      if (match != null) {
        _cookie = match.group(1);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_cookieKey, _cookie!);
        return;
      }
    }
  }

  Future<void> _clearCookie() async {
    _cookie = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cookieKey);
  }

  Map<String, String> get _headers => {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        if (_cookie != null) 'Cookie': _cookie!,
      };

  /// Headers required by the server's staged app-only download gate.
  Future<Map<String, String>> _appHeaders() async {
    final deviceId = await _loadDeviceId();
    final headers = Map<String, String>.from(_headers);
    headers['X-Dordoc-App'] = '1';
    headers['X-Dordoc-Device-Id'] = deviceId;
    return headers;
  }

  String _code(http.Response response) {
    try {
      final data = jsonDecode(response.body);
      if (data is Map && data['error'] is String) {
        return data['error'] as String;
      }
    } catch (_) {
      // Not a JSON error body.
    }
    return 'error';
  }

  /// Invoked when an authenticated request is rejected (expired session or the
  /// account was opened from another device). The shell returns to login.
  void Function()? onUnauthorized;

  ApiException _failure(http.Response response) {
    if (response.statusCode == 401) {
      onUnauthorized?.call();
    }
    return ApiException(response.statusCode, _code(response));
  }

  Future<void> login(String email, String password) async {
    await _loadCookie();
    final deviceId = await _loadDeviceId();
    final response = await _client.post(
      Uri.parse('$apiBase/api/auth/login'),
      headers: _headers,
      body: jsonEncode({
        'email': email.trim(),
        'password': password,
        'deviceId': deviceId,
      }),
    );
    if (response.statusCode != 200) {
      throw ApiException(response.statusCode, _code(response));
    }
    await _saveCookie(response);
  }

  /// Creates a pending account. No session is issued: the admin must approve
  /// it first, then the account starts with 6 free downloads.
  Future<bool> register(String email, String password) async {
    await _loadCookie();
    final deviceId = await _loadDeviceId();
    final response = await _client.post(
      Uri.parse('$apiBase/api/auth/register'),
      headers: _headers,
      body: jsonEncode({
        'email': email.trim(),
        'password': password,
        'deviceId': deviceId,
        'language': 'ar',
      }),
    );
    if (response.statusCode != 200) {
      throw ApiException(response.statusCode, _code(response));
    }
    return true;
  }

  Future<List<AppNotification>> notifications() async {
    await _loadCookie();
    final response = await _client.get(
      Uri.parse('$apiBase/api/notifications'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw ApiException(response.statusCode, _code(response));
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return ((data['notifications'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(AppNotification.fromJson)
        .toList();
  }

  Future<void> markNotificationsRead() async {
    await _loadCookie();
    await _client.post(
      Uri.parse('$apiBase/api/notifications/read'),
      headers: _headers,
    );
  }

  Future<bool> hasSession() async {
    await _loadCookie();
    if (_cookie == null) return false;
    try {
      final response = await _client.get(
        Uri.parse('$apiBase/api/auth/session'),
        headers: _headers,
      );
      if (response.statusCode == 200) return true;
      if (response.statusCode == 401) await _clearCookie();
      return false;
    } catch (_) {
      // Offline / server unreachable: keep the cookie for the next attempt.
      return false;
    }
  }

  Future<void> logout() async {
    await _loadCookie();
    try {
      await _client.post(
        Uri.parse('$apiBase/api/auth/logout'),
        headers: _headers,
      );
    } finally {
      await _clearCookie();
    }
  }

  /// Self-deletion: disables the account server-side and ends the session.
  Future<void> deleteAccount() async {
    await _loadCookie();
    final response = await _client.post(
      Uri.parse('$apiBase/api/auth/delete'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw _failure(response);
    }
    await _clearCookie();
  }

  Future<DownloadStatus> downloadStatus() async {
    await _loadCookie();
    final response = await _client.get(
      Uri.parse('$apiBase/api/downloads/status'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw _failure(response);
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return DownloadStatus(
      downloads: (data['downloads'] as num?)?.toInt() ?? 0,
      limit: (data['downloadLimit'] as num?)?.toInt(),
    );
  }

  Future<List<Specialty>> specialties() async {
    await _loadCookie();
    final response = await _client.get(
      Uri.parse('$apiBase/api/specialties'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw _failure(response);
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return ((data['items'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(Specialty.fromJson)
        .toList();
  }

  Future<List<Guide>> guides() async {
    await _loadCookie();
    final response = await _client.get(
      Uri.parse('$apiBase/api/guides'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      debugPrint(
        'dordoc: GET /api/guides -> ${response.statusCode} ${response.body}',
      );
      throw _failure(response);
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return ((data['guides'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(Guide.fromJson)
        .toList();
  }

  String _grantPath(http.Response response) {
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final url = data['url'] as String?;
    if (url == null || !url.startsWith('/api/dl/')) {
      throw ApiException(response.statusCode, 'missing-grant');
    }
    return url;
  }

  /// Consumes one balance unit and returns a single-attempt delivery path.
  Future<String> trackGuide(String id, {bool download = false}) async {
    await _loadCookie();
    final response = await _client.post(
      Uri.parse('$apiBase/api/guides/${Uri.encodeComponent(id)}/track'),
      headers: await _appHeaders(),
      body: jsonEncode({'mode': download ? 'download' : 'open'}),
    );
    if (response.statusCode != 200) throw _failure(response);
    return _grantPath(response);
  }

  /// Consumes one balance unit for one specific specialty link.
  Future<String> trackSpecialty(String specialtyId, int linkIndex) async {
    await _loadCookie();
    final response = await _client.post(
      Uri.parse('$apiBase/api/specialties/track'),
      headers: await _appHeaders(),
      body: jsonEncode({'specialtyId': specialtyId, 'linkIndex': linkIndex}),
    );
    if (response.statusCode != 200) throw _failure(response);
    return _grantPath(response);
  }

  /// Consume a one-attempt capability and stream its bytes straight to disk.
  ///
  /// Redirects are NOT followed by a browser: the HttpClient reads the short
  /// signed `Location` itself, so the final URL is never displayed or copied.
  Future<DownloadedFile> deliverGrant(
    String grantPath, {
    required Directory directory,
    String? preferredName,
  }) async {
    await _loadCookie();
    final headers = await _appHeaders();
    final client = HttpClient();
    try {
      var request = await client.getUrl(Uri.parse('$apiBase$grantPath'));
      request.followRedirects = false;
      headers.forEach((key, value) => request.headers.set(key, value));
      request.headers.set('Accept', 'application/octet-stream, application/json');
      var response = await request.close();

      Uri? finalUri;
      if (_isRedirect(response.statusCode)) {
        final location = response.headers.value('location');
        if (location == null || location.isEmpty) {
          throw ApiException(response.statusCode, 'missing-location');
        }
        await response.drain<void>();
        final parsed = Uri.parse(location);
        finalUri = parsed.hasScheme ? parsed : Uri.parse('$apiBase$location');
        request = await client.getUrl(finalUri);
        request.followRedirects = false;
        response = await request.close();
      }

      if (response.statusCode != 200) {
        final body = await _readErrorBody(response);
        throw ApiException(response.statusCode, _errorCode(body));
      }

      final name = _safeFileName(
        preferredName ??
            _fileNameFromHeaders(response.headers) ??
            _fileNameFromUri(finalUri) ??
            'dordoc-file',
      );
      final path = '${directory.path}${Platform.pathSeparator}$name';
      final sink = File(path).openWrite();
      try {
        await for (final chunk in response) {
          sink.add(chunk);
        }
        await sink.flush();
      } finally {
        await sink.close();
      }
      return DownloadedFile(path: path, fileName: name);
    } finally {
      client.close();
    }
  }

  static bool _isRedirect(int status) =>
      status == 301 || status == 302 || status == 303 || status == 307 || status == 308;

  static Future<String> _readErrorBody(HttpClientResponse response) async {
    final chunks = <List<int>>[];
    var length = 0;
    await for (final chunk in response) {
      chunks.add(chunk);
      length += chunk.length;
      if (length > 8192) break;
    }
    return utf8.decode(chunks.expand((chunk) => chunk).toList(), allowMalformed: true);
  }

  static String _errorCode(String body) {
    try {
      final data = jsonDecode(body);
      if (data is Map && data['error'] is String) return data['error'] as String;
    } catch (_) {
      // Not a JSON error body.
    }
    return 'error';
  }

  static String? _fileNameFromHeaders(HttpHeaders headers) {
    final value = headers.value('content-disposition');
    if (value == null) return null;
    final encoded = RegExp(r"filename\*\s*=\s*UTF-8''([^;]+)", caseSensitive: false)
        .firstMatch(value);
    if (encoded != null) {
      try {
        return Uri.decodeComponent(encoded.group(1)!.trim());
      } catch (_) {
        // Fall through to the plain filename.
      }
    }
    final quoted = RegExp(r'filename\s*=\s*"([^"]+)"', caseSensitive: false)
        .firstMatch(value);
    final plain = RegExp(r'filename\s*=\s*([^;]+)', caseSensitive: false)
        .firstMatch(value);
    return (quoted ?? plain)?.group(1)?.trim();
  }

  static String? _fileNameFromUri(Uri? uri) {
    if (uri == null || uri.pathSegments.isEmpty) return null;
    final segment = uri.pathSegments.last;
    if (segment.isEmpty || !segment.contains('.')) return null;
    try {
      return Uri.decodeComponent(segment);
    } catch (_) {
      return segment;
    }
  }

  static String _safeFileName(String raw) {
    var name = raw.replaceAll(RegExp(r'[\\/]'), '_');
    name = name.replaceAll(RegExp(r'[<>:"|?*\x00-\x1F]'), '_').trim();
    while (name.startsWith('.')) {
      name = name.substring(1);
    }
    if (name.isEmpty) name = 'dordoc-file';
    if (name.length > 120) {
      final dot = name.lastIndexOf('.');
      if (dot > 0 && name.length - dot < 12) {
        name = '${name.substring(0, 120 - (name.length - dot))}${name.substring(dot)}';
      } else {
        name = name.substring(0, 120);
      }
    }
    return name;
  }

  /// Returns the admin's welcome message the first time this account sees it.
  Future<String?> unseenWelcome() async {
    await _loadCookie();
    final response = await _client.get(
      Uri.parse('$apiBase/api/auth/welcome'),
      headers: _headers,
    );
    if (response.statusCode != 200) return null;
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (data['shown'] == true) return null;
    final message = (data['message'] as String?)?.trim();
    return (message == null || message.isEmpty) ? null : message;
  }

  /// Marks the welcome message as seen (once per account).
  Future<void> markWelcomeSeen() async {
    await _loadCookie();
    await _client.post(
      Uri.parse('$apiBase/api/auth/welcome'),
      headers: _headers,
    );
  }
}
