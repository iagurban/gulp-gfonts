require! {
  lodash: _
  async
  request: orig-request
  css
  path
  crypto
  'gulp-util'
  'html-to-text'
  vinyl
}

is-gulp = !!module.parent

function hash => crypto.createHash 'md5' .update it .digest 'hex'
function html2text => html-to-text.from-string it, ignore-href: true, ignore-image: true .replace /\n{2,}/mg, '\n'
function fatal => new gulp-util.PluginError 'gulp-gfonts', it, show-stack: true, show-properties: true
function prebounded bindings, fn, ...args, t => fn.apply null, args ++ [Function::bind.apply t, bindings]

request = (url, done) ->
  orig-request url, (.bind null, done) (done, e, r, b) !->
    [b, e] = switch
      | e? => [null, e]
      | 200 <= r.status-code < 400 => [r.body, e]
      | _ => [null, html2text b]
    done e, r, b

ext-defs =
  eot:
    mime: 'embedded-opentype'
    ua: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)'
    priority: 1
    postfix: '?#iefix'
    has-ghost: true
    ext: 'eot'

  woff:
    mime: 'woff'
    ua: 'Mozilla/4.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1667.0 Safari/537.36'
    priority: 4
    ext: 'woff'

  woff2:
    mime: 'woff2'
    ua: 'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
    priority: 3
    ext: 'woff2'

  svg:
    mime: 'svg'
    ua: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_0 like Mac OS X; en-us) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile/7A341 Safari/528.16'
    ext: 'svg'

  ttf:
    mime: 'truetype'
    ua: null
    priority: 10
    ext: 'ttf'

ext-defs.opentype = ext-defs.eot

# if is-gulp
require! {
  vinyl: File
  through2
}

is-binary = /[\x00-\x09\x0E-\x1F]/~test

# glob-idx = 0

weights-symbolic-mapping =
  normal: 400
  bold: 700

create-local = ->
  priority: 0
  name: it
  generate: -> "local('#{@name}')"

default-locals = [create-local '']

class Faces
  @prepare-font-weight = ->
    w = +it
    w = weights-symbolic-mapping["#{it}".to-lower-case!] if _.is-NaN w
    if w => (100 * Math.floor (w / 100)) else 400

  @prepare-font-family = (f) -> (f.match /^\'(.+)\'$/ ?.1) ? f

  (@options, @formats) ->
    @signatures = {}
    @locals = {}
    @font-files = {}

  add: ->
    @signature it .add it
    @

  signature: -> # get/create pre-sinature srcs container
    {signatures, locals, font-files, formats, options} = @

    r =
      family: it['font-family']
      weight: @@prepare-font-weight it['font-weight']
      style: it['font-style'] ? 'normal'
      range: it['unicode-range']

    throw 'font-family not found in @font-face declaration, skipping face' unless r.family
    r.family = @@prepare-font-family r.family

    throw "Unknown font-style: #{r.style}; skipping face" unless r.style in <[normal italic]>

    signature-base = "#{r.family.substr 0, 8}-#{r.weight}#{if r.style == 'italic' => 'i' else ''}".replace /[^_a-zA-Z0-9-]/g, '-'
    signature =
      [
        signature-base
        (r.range?replace /[Uu\s,]/g, '') ? ''
      ].join ''

    signatures[signature] ?= do
      _.assign r, do
        filename: -> @_filename ?= [@signature-base, hash @signature].join '-' .to-lower-case!
        srcs: []
        ie8srcs: []
        signature: signature
        signature-base: signature-base
        add: !->
          <~! it.src?split ',' .for-each
          switch
          | [full, url, fmt]? = it.match /\s*url\(([^\)]+)\)\s*(?:format\(\'(.+)\'\))?\s*/
            format = formats[fmt] ? formats[url.match /^[^#]+\.([_a-zA-Z0-9-]+)\s*$/ ?.1]

            return unless format
            return if _.find @srcs, -> it.url == url and it.format == format

            SrcProto =
              filename: -> @_filename ?= "#{@face.filename!}.#{@format.ext}"
              real-url: -> "#{path.join options.in-css-base, @filename!}#{@format.postfix ? ''}"
              embed-font: (font, next) !->
                @url = "data:font/#{@format.mime};charset=utf-8;base64,#{font.to-string 'base64'}"
                next!

              save-font: (font, next) !->
                @url = @real-url!
                font-files[path.join options.fonts-base, @filename!] = font
                next!

            mk = ~>
              face: @
              priority: 0
              url: url
              format: format

            if not options.noie8 and format.has-ghost
              @ie8srcs.push do
                ghost = _.assign (Object.create SrcProto), mk!, do
                  priority: 0
                  real-url: -> "#{path.join options.in-css-base, @filename!}"
                  generate: -> "url('#{@url}')"
                  got-font-content: -> @save-font ...

            @srcs.push do
              _.assign (Object.create SrcProto), mk!, do
                priority: format.priority
                ghost: ghost

                generate: -> "url('#{@url}') format('#{@format.mime}')"
                got-font-content: (e, f, next) !->
                  | e?
                    @invalid = true
                    console.log "cannot download font #{@filename!}: #{@url} with #{e}; skipping"
                    next null, e
                  | @format.embed => @embed-font f, (@ghost?got-font-content.bind @ghost, f, next) ? next
                  | _ =>
                    <~! @save-font f
                    @ghost?url = @ghost.real-url!
                    next!
                download-font: (next) !->
                  @downloaded = true
                  next, e, r, b <-! prebounded [@, next],
                    request, url: @url, encoding: null, headers: 'User-Agent': @format.ua
                  @got-font-content e, b, next

          | [full, name]? = it.match /\s*local\(\'(.+)\'\)\s*/
            lcs = locals[@signature-base]
            if lcs
              return if _.find lcs, (.name == name)
              lcs.push create-local name
            else
              locals[@signature-base] = [create-local name]

        generate: ->
          _.map do
            _.assign @{style, weight}, family: "'#{@family}'"
            -> "font-#{&1}: #{&0};"
          .concat if @range? => ["unicode-range: '#{@range}';"] else []
          .concat do
            @ie8srcs.map (.generate!)
            .concat do
              [
                _ ((locals[@signature-base] || default-locals) ++ @srcs)
                .filter (-> not it.invalid)
                .sort (.priority - &1.priority)
                .map (.generate!)
                .join ',\n    '
              ]
            .map -> "src: #{it};"
          .map (-> "  #{it}") .join '\n'
          |> -> "@font-face {\n#{it}\n}"

class Processor
  (in-options) !->
    options = @options =
      _.merge-with do
        _.assign {}, in-options
        in-css-base: './fonts'
        fonts-base: './fonts'
        css-base: './fonts'
        css-name: 'fonts.css'
        limit-downloads: 4
        embed: false
        noie8: false
        formats: null
        -> &0 ? &1

    @download-css = that if options.___mock-download-css

    @formats = {}

    concrete-format = ~> @formats[&0] = _.assign {}, ext-defs[&0], &1

    options-validators =
      limit-downloads: [
        -> 1 <= it <= 20
        'number (1 to 20)'
      ]

      formats: [
        ->
          it ?= Object.keys ext-defs

          try
            switch
            | _.is-array it
              <-! _.for-each it
              throw '' unless it of ext-defs
              concrete-format it, embed: !!options.embed

            | _.is-object it
              <-! _.for-each it
              throw '' unless &1 of ext-defs
              switch
              | _.is-object &0 => concrete-format &1, embed: !!(&0.embed ? options.embed)
              | _ =>              concrete-format &1, embed: !!options.embed if &0

            | _ => throw ''
          catch
            return false
          return true
        'array of strings of map with type:[bool|object]'
      ]

    _.for-each options, ->
      v = options-validators[&1]
      if v? and not v.0 &0
        throw "Wrong option value for key #{&1}: #{&0} (expected #{v.1})"

    @registry = new Faces @options, @formats

  prepare-input: (input) ->
    if is-binary input
      throw "source must be buffer with string, got #{input}"

    try
      q =
        _.map (JSON.parse input), ->
          [
            * &1.replace /\s/g, \+
            * switch
              | _.is-string &0 => &0
              | _.is-array &0 => &0.join ','
              | _ => throw 'wrong font garnitures definition, can be string like "100,500i" or array of that items'
          ].join ':'
        .join '|'
      "family=#{q}"
    catch e
      throw e if e.name != \SyntaxError
      input

  download-css: (query, next) ->
    async.parallel-limit do
      _.map @formats, ({ua}) ->
          (.bind null, ua) (ua, next) ->
            e, r, b <-! request do
              url: "http://fonts.googleapis.com/css?#{query}"
              headers: 'User-Agent': ua ? ''
            next e, b
      @options.limit-downloads
      next

  process-input: (input, next) !->
    {options, formats, registry, collected-css, font-files} = @

    try
      input = @prepare-input input
    catch e
      return next e

    e, raws <~! @download-css input

    return next e if e?

    raws.map ->
      data = css.parse it
      data[data.type].rules.filter (.type == 'font-face') .map ->
        _.from-pairs do
          it.declarations.filter (.type == 'declaration') .map -> [it.property, it.value]
    .for-each !-> it.for-each !->
      try
        registry.add it
      catch e # just skip inproperly declared fonts
        console.warn e

    e <-! async.parallel-limit do
      * _.reduce @registry.signatures, (++ &1.srcs), []
        .filter -> not it.downloaded
        .map -> it~download-font
      * options.limit-downloads
    next e

  write: (write) ->
    _.for-each @registry.font-files, (content, name) -> write name, content

    write do
      path.join @options.css-base, @options.css-name
      new Buffer do
        _.map @registry.signatures, (.generate!) .join '\n'

Processor.Faces = Faces

module.exports = (options) ->
  through2.obj do
    (input, enc, next) !->
      return next! if @__gfont_error

      try
        switch
        | (gulp-util.is-buffer input) or _.is-string input => input
        | input.is-stream! => throw 'streams not supported'
        | input.is-directory! or input.is-null! => return next!
        | _ => input .= contents

        ctx = (@__gfont_ctx ?= new Processor options)

      catch e
        @__gfont_error = e
        return next!

      e, r <~! ctx.process-input String input

      if e?
        @__gfont_ctx = null
        @__gfont_error = e

      next!

    (next) !->
      if @__gfont_error
        @emit 'error', fatal that
      else
        @__gfont_ctx?write (path, contents) !~> @push new File {path, contents}
      next!

_.assign module.exports, {Processor}

# else
#   throw 'Unimplemented'

  # require! {
  #   fs
  #   mkdirp
  # }

  # do -> # main
  #   # process.stdin
  #   # .on 'data', (buf) -> console.log buf.toString! #  src += buf.toString!
  #   # .on 'end', ->
  #     main do
  #       {}
  #       (filename, contents, next) ->
  #         async.series do
  #           [
  #             async.apply mkdirp, path.dirname filename
  #             async.apply fs.writeFile, filename, contents, null
  #           ]
  #           next

  #       (err, r) ->
  #         console.log r
  #         if err
  #           console.log \ERROR
  #           throw err
  #         process.exit 0

