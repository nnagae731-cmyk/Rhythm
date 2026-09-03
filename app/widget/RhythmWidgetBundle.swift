import WidgetKit
import SwiftUI

@main
struct RhythmWidgetBundle: WidgetBundle {
  var body: some Widget {
    RhythmWidget()
    RhythmCurrentTaskWidget()
    RhythmNextScheduleWidget()
    RhythmMonthlyCalendarWidget()
    RhythmWeeklyCalendarWidget()
    RhythmTodayScheduleWidget()
    RhythmChecklistWidget()
    RhythmGoalWidget()
    RhythmVoiceWidget()
    RhythmAffirmationWidget()
    if #available(iOS 16.1, *) {
      RhythmLiveActivityWidget()
    }
  }
}
