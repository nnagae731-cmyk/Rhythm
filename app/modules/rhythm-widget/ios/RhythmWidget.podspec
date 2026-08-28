Pod::Spec.new do |s|
  s.name = 'RhythmWidget'
  s.version = '1.0.0'
  s.summary = 'Shares the lightweight Rhythm widget snapshot with WidgetKit.'
  s.platforms = { :ios => '15.1' }
  s.source = { :git => '' }
  s.static_framework = true
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
end
