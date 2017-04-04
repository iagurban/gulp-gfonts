require! {
  lodash: _
  async
  request
  css
  path
  crypto
  'gulp-util'
  'html-to-text'
}

is-gulp = !!module.parent

hash = -> crypto.createHash 'md5' .update it .digest 'hex'

html2text = -> html-to-text.from-string it, ignore-href: true, ignore-image: true .replace /\n{2,}/mg, '\n'

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

fatal = ->
  new gulp-util.PluginError 'gulp-gfonts', it, show-stack: true, show-properties: true

function prebounded bindings, fn, ...args, t => fn.apply null, args ++ [Function::bind.apply t, bindings]

main = (options, write, next) !->
  options =
    _.merge-with do
      _.assign {}, options
      query: null
      in-css-base: './fonts'
      fonts-base: './fonts'
      css-base: './fonts'
      css-name: 'fonts.css'
      limit-downloads: 4
      embed: false
      fork: false
      noie8: false
      fonts-stream: null
      -> &0 ? &1

  fonts-stream = main-stream = @
  fonts-stream = through2.obj! if options.fonts-stream?

  formats = {}

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
            formats[it] = _.assign do
              {}
              ext-defs[it]
              embed: !!options.embed

          | _.is-object it
            <-! _.for-each it
            throw '' unless &1 of ext-defs
            switch
            | _.is-object &0
              formats[&1] = _.assign do
                {}
                ext-defs[&1]
                embed: &0.embed ? !!options.embed
            | _ =>
              if &0
                formats[&1] = _.assign do
                  {}
                  ext-defs[&1]
                  embed: !!options.embed

          | _ => throw ''
        catch
          return false
        return true
      'array of strings of map with type:[bool|object]'
    ]

  try
    _.for-each options, ->
      v = options-validators[&1]
      if v? and not v.0 &0
        throw "Wrong option value for key #{&1}: #{&0} (expected #{v.1})"
  catch e
    return next e

  prepare-font-weight = (w) ->
    | not w? => 400
    | _.is-string w
      if (w.match '^([0-9]+)$')? => parse-int w else (weights-symbolic-mapping[w] ? 400)
    | _ => 400

  prepare-font-family = (f) -> (f.match /^\'(.+)\'$/ ?.1) ? f

  signatures = {}
  locals = {}

  signature = -> # get/create pre-sinature srcs container
    r =
      family: prepare-font-family it['font-family']
      weight: prepare-font-weight it['font-weight']
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
                write fonts-stream, (path.join options.fonts-base, @filename!), font, next

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
                  got-font-content: !-> @save-font ...

            @srcs.push do
              (Object.create SrcProto) <<< mk! <<< do
                priority: format.priority ? 10
                ghost: ghost

                generate: -> "url('#{@url}') format('#{@format.mime}')"
                got-font-content: (e, f, next) !->
                  | e?
                    @invalid = true
                    console.log "cannot download font #{@filename!}: #{@url} with #{e}; skipping"
                    next null, e
                  | @format.embed => @embed-font f, (@ghost?got-font-content.bind @ghost, f, next) ? next
                  | _ => @save-font f, !~> @ghost?url = @ghost.real-url!; next!

          | [full, name]? = it.match /\s*local\(\'(.+)\'\)\s*/
            with locals[][@signature-base]
              return if _.find .., (.name == name)
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
          e, r, b <-! request do
            "http://fonts.googleapis.com/css?#{options.query}"
            headers: 'User-Agent': ua ? ''
          [b, e] = switch
            | e? => [null, e]
            | 200 <= r.status-code < 400 => [r?body, e]
            | _ => [null, html2text b]
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
          [b, e] = switch
            | e? => [null, e]
            | 200 <= r.status-code < 400 => [r?body, e]
            | _ => [null, html2text b]
          src.got-font-content e, b, next
    * options.limit-downloads

  return next e if e?

  {restricted}? <~! do
    if options.fonts-stream?
      (next) ->
        mode = restricted: false
        process.next-tick fonts-stream~end
        s = options.fonts-stream fonts-stream, next.bind null, mode
        if s?
          mode.restricted = true
          s.on 'end', next.bind null, null
    else -> it!

  return next 'Calling callback after stream returned' if restricted

  write do
    main-stream
    path.join options.css-base, options.css-name
    new Buffer do
      _.map signatures, (.generate!) .join '\n'
    next

# if is-gulp
require! {
  vinyl: File
  through2
}

module.exports = (options) ->
  through2.obj (input, enc, next) !->
    main.call do
      @
      options

      (stream, path, contents, next) !->
        stream.push new File {path, contents}
        next null, null

      (e, r) !~>
        if e?
          # console.log 11111, e, r
          @emit 'error', (e = fatal e)
        else
          next null, r

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

