import SwiftUI

/// AI Recap for Apple Watch — a remote control for the iPhone recorder (Product Plan §7, "watch"
/// capability), recording on the watch itself when the phone app is not open. The watch-face
/// complication (targets/watch-widget) opens the app via `airecap-watch://record`, which starts a
/// recording straight away so the whole flow is one tap.
@main
struct AIRecapWatchApp: App {
  @StateObject private var link = PhoneLink.shared

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(link)
        .onOpenURL { url in
          guard url.scheme == "airecap-watch", url.host == "record" else { return }
          link.startIfIdle()
        }
    }
  }
}
