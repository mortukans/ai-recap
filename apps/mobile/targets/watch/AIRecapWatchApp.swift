import SwiftUI

/// AI Recap for Apple Watch — a remote control for the iPhone recorder (Product Plan §7, "watch"
/// capability). The microphone stays on the phone; the watch starts/pauses/finishes and mirrors the
/// timer over WatchConnectivity.
@main
struct AIRecapWatchApp: App {
  @StateObject private var link = PhoneLink.shared

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(link)
    }
  }
}
