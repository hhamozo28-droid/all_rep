import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'api.dart';
import 'deep_link.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'strings.dart';
import 'theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  DeepLinkService.instance.start();
  runApp(const DordocApp());
}

class DordocApp extends StatelessWidget {
  const DordocApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: appName,
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AppTheme.data,
      builder: (context, child) => Directionality(
        textDirection: TextDirection.rtl,
        child: child ?? const SizedBox.shrink(),
      ),
      home: const SessionGate(),
    );
  }
}

/// Decides between the login screen and the signed-in shell by checking the
/// persisted `dl_session` cookie against the existing web API.
class SessionGate extends StatefulWidget {
  const SessionGate({super.key});

  @override
  State<SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<SessionGate> {
  bool? _signedIn;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    setState(() => _signedIn = null);
    final ok = await Api.instance.hasSession();
    if (!mounted) return;
    setState(() => _signedIn = ok);
  }

  @override
  Widget build(BuildContext context) {
    final signedIn = _signedIn;
    if (signedIn == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (signedIn) {
      return HomeScreen(
        onSignedOut: () {
          if (!mounted) return;
          setState(() => _signedIn = false);
        },
      );
    }
    return LoginScreen(
      onSignedIn: () {
        if (!mounted) return;
        setState(() => _signedIn = true);
      },
    );
  }
}
