import SwiftUI
import WidgetKit

/// Static "Record" complication. WidgetKit accessory widgets on watchOS cannot run code on tap; the
/// `widgetURL` opens the watch app, which starts a recording immediately (see AIRecapWatchApp.onOpenURL).
struct RecordEntry: TimelineEntry {
  let date: Date
}

struct RecordProvider: TimelineProvider {
  func placeholder(in context: Context) -> RecordEntry { RecordEntry(date: .now) }
  func getSnapshot(in context: Context, completion: @escaping (RecordEntry) -> Void) {
    completion(RecordEntry(date: .now))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<RecordEntry>) -> Void) {
    completion(Timeline(entries: [RecordEntry(date: .now)], policy: .never))
  }
}

struct RecordComplicationView: View {
  @Environment(\.widgetFamily) private var family
  var entry: RecordEntry

  var body: some View {
    Group {
      switch family {
      case .accessoryCorner:
        Image(systemName: "mic.fill")
          .font(.title3)
          .widgetLabel { Text("Record") }
      case .accessoryRectangular:
        HStack(spacing: 8) {
          Image(systemName: "mic.fill").font(.title2)
          VStack(alignment: .leading, spacing: 2) {
            Text("AI Recap").font(.headline)
            Text("Tap to record").font(.caption2).foregroundStyle(.secondary)
          }
          Spacer(minLength: 0)
        }
      case .accessoryInline:
        Label("Record recap", systemImage: "mic.fill")
      default: // .accessoryCircular
        ZStack {
          AccessoryWidgetBackground()
          Image(systemName: "mic.fill").font(.title2)
        }
      }
    }
    .widgetURL(URL(string: "airecap-watch://record"))
    .containerBackground(for: .widget) { Color.clear }
  }
}

@main
struct RecordComplication: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "lv.airecap.record", provider: RecordProvider()) { entry in
      RecordComplicationView(entry: entry)
    }
    .configurationDisplayName("Record")
    .description("Start a recording with one tap.")
    .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryRectangular, .accessoryInline])
  }
}
