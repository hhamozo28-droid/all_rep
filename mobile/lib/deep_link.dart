import 'package:app_links/app_links.dart';

/// Receives `dordoc://dl/<token>` and verified App Links
/// `https://allrep-theta.vercel.app/dl/<token>`.
///
/// A link that arrives before the user is signed in is kept until HomeScreen
/// registers its consumer, so login does not lose the pending download.
class DeepLinkService {
  DeepLinkService._();

  static final instance = DeepLinkService._();

  final AppLinks _links = AppLinks();
  bool _started = false;
  String? _pendingToken;
  void Function(String token)? _listener;

  static final RegExp _tokenPattern = RegExp(r'^[A-Za-z0-9_-]{43}$');

  void start() {
    if (_started) return;
    _started = true;
    _links.uriLinkStream.listen(_accept, onError: (_) {});
    _links
        .getInitialLink()
        .then((uri) {
          if (uri != null) _accept(uri);
        })
        .catchError((_) {});
  }

  void register(void Function(String token) listener) {
    _listener = listener;
    final pending = _pendingToken;
    if (pending != null) {
      _pendingToken = null;
      listener(pending);
    }
  }

  void unregister(void Function(String token) listener) {
    if (_listener == listener) _listener = null;
  }

  void _accept(Uri uri) {
    final token = tokenFrom(uri);
    if (token == null) return;
    final listener = _listener;
    if (listener != null) {
      listener(token);
    } else {
      _pendingToken = token;
    }
  }

  static String? tokenFrom(Uri uri) {
    if (uri.scheme == 'dordoc' && uri.host == 'dl') {
      for (final segment in uri.pathSegments) {
        if (segment.isNotEmpty && _tokenPattern.hasMatch(segment)) {
          return segment;
        }
      }
      return null;
    }
    if ((uri.scheme == 'https' || uri.scheme == 'http') &&
        uri.host == 'allrep-theta.vercel.app' &&
        uri.path.startsWith('/dl/')) {
      final parts = uri.pathSegments;
      if (parts.length >= 2 && _tokenPattern.hasMatch(parts[1])) {
        return parts[1];
      }
    }
    return null;
  }
}
