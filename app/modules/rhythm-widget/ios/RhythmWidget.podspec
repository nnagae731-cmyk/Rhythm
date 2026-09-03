Pod::Spec.new do |s|
  s.name = 'RhythmWidget'
  s.version = '1.0.0'
  s.summary = 'Shares the lightweight Rhythm widget snapshot with WidgetKit.'
  s.authors = { 'Rhythm' => 'https://github.com/nnagae731-cmyk/Rhythm' }
  s.homepage = 'https://github.com/nnagae731-cmyk/Rhythm'
  s.license = { :type => 'MIT' }
  s.platforms = { :ios => '15.1' }
  s.source = { :git => 'https://github.com/nnagae731-cmyk/Rhythm.git', :tag => s.version.to_s }
  s.static_framework = true
  # ActivityKit is weak-linked so the same app binary remains launchable on
  # the existing iOS 15.1 deployment target.
  s.weak_framework = 'ActivityKit'
  s.frameworks = 'Vision'
  # This podspec lives beside the module implementation. Keep the source
  # explicit so CocoaPods always adds it to the RhythmWidget target.
  s.source_files = ['RhythmWidgetModule.swift', 'RhythmLiveActivityAttributes.swift']
  s.dependency 'ExpoModulesCore'
end
