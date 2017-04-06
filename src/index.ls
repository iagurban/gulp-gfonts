require! {
  lodash: _
  async
  request: orig-request
  css
  path
  crypto
  'gulp-util'
  'html-to-text'
}

is-gulp = !!module.parent

function hash => crypto.createHash 'md5' .update it .digest 'hex'
function html2text => html-to-text.from-string it, ignore-href: true, ignore-image: true .replace /\n{2,}/mg, '\n'
function fatal => new gulp-util.PluginError 'gulp-gfonts', it, show-stack: true, show-properties: true
function prebounded bindings, fn, ...args, t => fn.apply null, args ++ [Function::bind.apply t, bindings]

request = (url, params, done) ->
  orig-request url, params, (.bind null, done) (done, e, r, b) !->
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

  woff:
    mime: 'woff'
    ua: 'Mozilla/4.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1667.0 Safari/537.36'
    priority: 4

  woff2:
    mime: 'woff2'
    ua: 'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
    priority: 3

  svg:
    mime: 'svg'
    ua: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_0 like Mac OS X; en-us) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile/7A341 Safari/528.16'

  ttf:
    mime: 'truetype'
    ua: null
    priority: 10

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

class Processor
  (in-options) !->
    @font-files = {}
    @collected-css = {}

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
        fonts-stream: null
        formats: null
        -> &0 ? &1

    @formats = {}

    concrete-format = ~> @formats[&0] = _.assign {}, ext-defs[&0], &1

    options-validators =
      fonts-stream: [
        -> not it? or _.is-function it
        'function'
      ]

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

  @prepare-font-weight = ->
    w = +it
    w = weights-symbolic-mapping["#{it}".to-lower-case!] if _.is-NaN w
    if w => (100 * Math.floor (w / 100)) else 400

  @prepare-font-family = (f) -> (f.match /^\'(.+)\'$/ ?.1) ? f

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

  process-input: (input, next) !->
    {options, formats, font-files, collected-css} = @

    try
      input = @prepare-input input
    catch e
      return next e

    query = input

    request-css =
      # if options.__mock_downloaded-css?
        # (.bind null, that) (css, url, options, next) -> next null, css
      # else
      request

    signatures = {}
    locals = {}

    signature = -> # get/create pre-sinature srcs container
      r =
        family: @@prepare-font-family it['font-family']
        weight: @@prepare-font-weight it['font-weight']
        style: it['font-style'] ? 'normal'
        range: it['unicode-range']

      return (console.log "Unknown font-style: #{r.style}; skipping face"; null) unless r.style in <[normal italic]>

      signature-base = "#{r.family.substr 0, 8}-#{r.weight}#{if r.style == 'italic' => 'i' else ''}".replace /[^_a-zA-Z0-9-]/g, '-'
      signature =
        [
          signature-base
          (r.range?replace /[Uu\s,]/g, '') ? ''
        ].join ''

      signatures[signature] ?= do
        r <<< do
          filename: -> @_filename ?= [@signature-base, hash @signature].join '-' .to-lower-case!
          srcs: []
          ie8srcs: []
          signature: signature
          signature-base: signature-base
          add: !->
            <~! it.src.split ',' .map (.match /^\s*(.*)\s*$/ ?.1) .for-each
            switch
            | _.find @srcs, it => return

            | [full, url, format]? = it.match /\s*url\(([^\)]+)\)\s*(?:format\(\'(.+)\'\))?\s*/
              ext = url.match /^[^#]+\.([_a-zA-Z0-9-]+)$/ ?.1
              return unless (format = formats[ext])?

              SrcProto =
                filename: -> @_filename ?= "#{@face.filename!}.#{@ext}"
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
                ext: ext
                format: format

              if not options.noie8 and ext == \eot
                @ie8srcs.push do
                  ghost = (Object.create SrcProto) <<< mk! <<< do
                    priority: 0
                    real-url: -> "#{path.join options.in-css-base, @filename!}"
                    generate: -> "url('#{@url}')"
                    got-font-content: -> @save-font ...

              @srcs.push do
                (Object.create SrcProto) <<< mk! <<< do
                  priority: format.priority || 10
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

            | [full, name]? = it.match /\s*local\(\'(.+)\'\)\s*/
              with locals[][@signature-base]
                unless _.find .., (.name == name)
                  ..push do
                    priority: 0
                    name: name
                    generate: -> "local('#{@name}')"

          generate: ->
            _.map do
              @{style, weight} <<< family: "'#{@family}'"
              -> "font-#{&1}: #{&0};"
            .concat if @range? => ["unicode-range: '#{@range}';"] else []
            .concat do
              @ie8srcs.map (.generate!)
              .concat do
                [
                  _ (locals[][@signature-base] ++ @srcs)
                  .filter (-> not it.invalid)
                  .sort (.priority - &1.priority)
                  .map (.generate!)
                  .join ',\n    '
                ]
              .map -> "src: #{it};"
            .map (-> "  #{it}") .join '\n'
            |> -> "@font-face {\n#{it}\n}"

    e, raws <~! async.parallel-limit do
      * _.map formats, ({ua}) ->
          (.bind null, ua) (ua, next) ->
            e, r, b <-! request-css do
              "http://fonts.googleapis.com/css?#{query}"
              headers: 'User-Agent': ua ? ''
            next e, b
      * options.limit-downloads

    return next e if e?

    raws.map (rawcss) ->
      data = css.parse rawcss
      data[data.type].rules.filter (.type == 'font-face') .map ->
        _.from-pairs do
          it.declarations.filter (.type == 'declaration') .map -> [it.property, it.value]
    .reduce (++ &1), []
    .for-each !-> signature it ?.add it

    e <-! async.parallel-limit do
      * _.reduce signatures, (++ &1.srcs), [] .map (src) ->
          (.bind null, src) (src, next) ->
            # console.log src.url, src.filename!
            src, e, r, b <-! prebounded [null, src], request, url: src.url, encoding: null
            src.got-font-content e, b, next
      * options.limit-downloads

    return next e if e?

    collected-css[path.join options.css-base, options.css-name] = new Buffer do
      _.map signatures, (.generate!) .join '\n'

    next!

  write: (main-stream, write, next) ->
    fonts-stream = if @options.fonts-stream? => through2.obj! else main-stream

    <~! async.each-of-series @collected-css, ((content, name, next) -> write main-stream,  name, content, next)
    <~! async.each-of-series @font-files,    ((content, name, next) -> write fonts-stream, name, content, next)

    restricted, called <~! do
      unless @options.fonts-stream? => (-> it {}, {}) else (next) ~>
        restricted = v: false
        called = v: false

        process.next-tick fonts-stream~end
        s = @options.fonts-stream fonts-stream, next.bind null, restricted, called
        if s?
          restricted.v = true
          s.on 'finish', next.bind null, {}, called

    if restricted.v
      called.v = true # calling main 'next' with error
      return next 'Calling callback after stream returned'
    return if called.v # main 'next' already called
    called.v = true # main 'next' will be called in 'write'
    next!

module.exports = (options) ->
  through2.obj do
    (input, enc, next) !->
      try
        ctx = (@__gfont_ctx ?= new Processor options) #, glob-idx: glob-idx++
      catch e
        @emit 'error', fatal e


      switch
      | gulp-util.is-buffer input.contents
        input := String input.contents
      | gulp-util.is-stream input.contents
        throw "streams not supported"
      | not input.is-directory! and not input.is-null!
        throw "unsupported input: #{input}"
      | _ => input := null


      e, r <~! ctx.process-input input

      if e?
        # console.log 11111, e, r
        @emit 'error', fatal e
      else
        next!

    (next) !->
      e, r <~! @__gfont_ctx.write do
        @
        (stream, path, contents, next) !->
          stream.push new File {path, contents}
          next null, null

      if e?
        # console.log 11111, e, r
        @emit 'error', fatal e
      else
        @emit 'finish'
        next!

module.exports <<< {Processor}

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

