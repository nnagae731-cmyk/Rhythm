Pod::Spec.new do |s|
  s.name = 'RhythmFamily'
  s.version = '1.0.0'
  s.summary = 'Isolated CloudKit family sharing foundation for Rhythm.'
  s.authors = { 'Rhythm' => 'https://github.com/nnagae731-cmyk/Rhythm' }
  s.homepage = 'https://github.com/nnagae731-cmyk/Rhythm'
  s.license = { :type => 'MIT' }
  s.platforms = { :ios => '17.0' }
  s.source = { :git => 'https://github.com/nnagae731-cmyk/Rhythm.git', :tag => s.version.to_s }
  s.static_framework = true
  s.swift_version = '5.0'
  s.frameworks = 'CloudKit', 'UIKit', 'CryptoKit'
  s.source_files = '*.swift'
  s.dependency 'ExpoModulesCore'
end
