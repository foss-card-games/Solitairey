JS_PREFIX = 'js'.freeze
JS_SRC_PREFIX = 'src/js'.freeze
PREFIX = 'dest/js'.freeze
JS = %w[yui-breakout solitaire iphone auto-stack-clear auto-turnover autoplay
        ie-opera-background-fix statistics solver-freecell
        solver-freecell-worker agnes
        golf klondike klondike1t flowergarden fortythieves freecell grandclock
        montecarlo pyramid russian-solitaire scorpion spider spider1s spider2s
        spiderette tritowers will-o-the-wisp yukon application].freeze
YUI_SRC = 'ext/yui/yui-all-min.js'.freeze
YUI = "#{PREFIX}/yui-all-min.js".freeze
ALL = "#{PREFIX}/all.js".freeze
MINIFIED = "#{PREFIX}/all-min.js".freeze
COMBINED = "#{PREFIX}/combined-min.js".freeze
COMPRESSOR = 'ext/yuicompressor-2.4.2/build/yuicompressor-2.4.2.jar'.freeze
TEMPLATE = 'index.erb'.freeze

IMAGES = Dir.glob('{dondorf,layouts}/**/*.png') + \
         Dir.glob('*.{css,gif,png,jpg}')

DEST_INDEX = 'dest/index.html'.freeze
DEST_INDEX_DEV = 'dest/index-dev.html'.freeze

def create_index(index, development = false)
  require 'erb'

  File.open(index, 'w') do |f|
    f.write(ERB.new(File.read(TEMPLATE)).result(binding))
  end
end

DEST_IMAGES = []
IMAGES.each do |img|
  d = "dest/#{img}"
  DEST_IMAGES << d
  file d => img do
    sh "mkdir -p $(dirname #{d})"
    sh "cp -f #{img} #{d}"
  end
end

file YUI => YUI_SRC do
  sh "cp -f #{YUI_SRC} #{YUI}"
end

dest_js_s = []

JS.each do |fn_base|
  fn = fn_base + '.js'
  src = "#{JS_SRC_PREFIX}/#{fn}"
  dest = "#{PREFIX}/#{fn}"
  dest_js_s << dest
  file dest => src do
    sh "cp -f #{src} #{dest}"
  end
end

desc 'concatenated solitaire sources'
file ALL => dest_js_s do
  File.open(ALL, 'w') do |f|
    JS.each do |fn|
      f.write(File.read("#{JS_SRC_PREFIX}/#{fn}.js"))
    end
  end
end

desc 'minified solitaire sources'
file MINIFIED => ALL do
  sh "java -jar #{COMPRESSOR} -o #{MINIFIED} #{ALL}"
end

desc 'concatenated minified solitaire and YUI sources'
file COMBINED => [YUI, MINIFIED] do
  sh "cat #{YUI} #{MINIFIED} > #{COMBINED}"
end

desc 'development file with seperated, unminified source files'
file DEST_INDEX_DEV => TEMPLATE do
  create_index DEST_INDEX_DEV, true
end

desc 'production file with seperated, unminified source files'
file DEST_INDEX => [TEMPLATE, COMBINED] do
  create_index DEST_INDEX
end

task images: DEST_IMAGES

task :clean do
  sh "rm -f #{[ALL, MINIFIED, COMBINED, DEST_INDEX, DEST_INDEX_DEV].join(' ')}"
end

task upload: :default do
  sh 'rsync --progress --inplace -a -v dest ' \
    'hostgator:public_html/temp-Solitairey-ekrimyk/'
end

task default: [DEST_INDEX, DEST_INDEX_DEV, :images]
