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
  # This podspec lives in the module's ios directory, so source paths are
  # relative to this directory (not the package root).
  s.source_files = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
end
