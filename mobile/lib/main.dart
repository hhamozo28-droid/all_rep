import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'api.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'strings.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const DordocApp());
}

class DordocApp extends StatelessWidget {
  const DordocApp({super.key});

  static const _seed = Color(0xFF0E6F5C);

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
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: _seed),
        scaffoldBackgroundColor: const Color(0xFFF4F2EC),
        appBarTheme: const AppBarTheme(
          backgroundColor: _seed,
          foregroundColor: Colors.white,
          centerTitle: true,
        ),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
          filled: true,
          fillColor: Colors.white,
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size(64, 48),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
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
