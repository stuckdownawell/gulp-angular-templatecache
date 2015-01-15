var es = require('event-stream');
var path = require('path');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var header = require('gulp-header');
var footer = require('gulp-footer');
var htmlJsStr = require('js-string-escape');

/**
 * "constants"
 */

var TEMPLATE_HEADER = 'angular.module("<%= module %>"<%= standalone %>).run(["<%= cache %>", function(<%= cache %>) {';
var TEMPLATE_FOOTER = '}]);';
var DEFAULT_FILENAME = 'templates.js';
var DEFAULT_MODULE = 'templates';
var DEFAULT_CACHE = '$templateCache';
var MODULE_TEMPLATES = {

  requirejs: {
    header: 'define([\'angular\'], function(angular) { \'use strict\'; return ',
    footer: '});'
  },

  browserify: {
    header: '\'use strict\'; module.exports = '
  }

};

/**
 * Add files to templateCache.
 */

function templateCacheFiles(root, base, cache) {

  return function templateCacheFile(file, callback) {
    var template = '<%= cache %>.put("<%= url %>",\'<%= contents %>\');';
    var url;

    file.path = path.normalize(file.path);

    /**
     * Rewrite url
     */

    if (typeof base === 'function') {
      url = path.join(root, base(file));
    } else {
      url = path.join(root, file.path.replace(base || file.base, ''));
    }

    /**
     * Normalize url (win only)
     */

    if (process.platform === 'win32') {
      url = url.replace(/\\/g, '/');
    }

    /**
     * Create buffer
     */

    file.contents = new Buffer(gutil.template(template, {
      url: url,
      contents: htmlJsStr(file.contents),
      file: file,
      cache : cache
    }));

    callback(null, file);

  };

}

/**
 * templateCache a stream of files.
 */

function templateCacheStream(root, base, cache) {

  /**
   * Set relative base
   */

  if (typeof base !== 'function' && base && base.substr(-1) !== path.sep) {
    base += path.sep;
  }

  /**
   * templateCache files
   */

  return es.map(templateCacheFiles(root, base, cache));

}

/**
 * Wrap templateCache with module system template.
 */

function wrapInModule(moduleSystem) {
  var moduleTemplate = MODULE_TEMPLATES[moduleSystem];

  if (!moduleTemplate) {
    return gutil.noop();
  }

  return es.pipeline(
    header(moduleTemplate.header || ''),
    footer(moduleTemplate.footer || '')
  );

}

/**
 * Concatenates and registers AngularJS templates in the $templateCache.
 *
 * @param {string} [filename='templates.js']
 * @param {object} [options]
 */

function templateCache(filename, options) {

  /**
   * Prepare options
   */

  if (typeof filename === 'string') {
    options = options || {};
  } else {
    options = filename || {};
    filename = options.filename || DEFAULT_FILENAME;
  }

  /**
   * Normalize moduleSystem option
   */

  if (options.moduleSystem) {
    options.moduleSystem = options.moduleSystem.toLowerCase();
  }

  /**
   * Prepare header / footer
   */

  var templateHeader = options.templateHeader || TEMPLATE_HEADER;
  var templateFooter = options.templateFooter || TEMPLATE_FOOTER;

  options.cache = options.cache || DEFAULT_CACHE;

  /**
   * Build templateCache
   */

  return es.pipeline(
    templateCacheStream(options.root || '', options.base, options.cache),
    concat(filename),
    header(templateHeader, {
      module: options.module || DEFAULT_MODULE,
      standalone: options.standalone ? ', []' : '',
      cache : options.cache
    }),
    footer(templateFooter),
    wrapInModule(options.moduleSystem)
  );

}


/**
 * Expose templateCache
 */

module.exports = templateCache;
