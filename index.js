var through = require('through2');
var rework = require('rework');
var split = require('rework-split-media');
var reworkMoveMedia = require('rework-move-media');
var stringify = require('css-stringify');
var cleanUpString = require('clean-up-string');
var dirname = require('path').dirname;
var pathjoin = require('path').join;
var basename = require('path').basename;

module.exports = function (filter) {
	return through.obj(function (cssFile, characterEncoding, callback) {
		var stream = this;
		var fileName = basename(cssFile.path, '.css');
		var reworkData = rework(cssFile.contents.toString()).use(reworkMoveMedia());
		var stylesheets = split(reworkData);
		var stylesheetKeys = Object.keys(stylesheets);

		stylesheetKeys.forEach(function (mediaQuery) {
			// Replace 兼容 min-width:768px 之类冒号后边没有空格的写法
			var mediaQueryStringId = cleanUpString(mediaQuery.replace(/:\s?/g, '-'));

			if (typeof filter === 'function' && !filter(fileName, mediaQueryStringId)) return

			var fileClone = cssFile.clone({
				contents: false
			});

			var contents = stringify(stylesheets[mediaQuery]);
			fileClone.contents = new Buffer(contents);

			if (mediaQueryStringId) {
				mediaQueryStringId = fileName + '-' + mediaQueryStringId;
				fileClone.path = pathjoin(dirname(cssFile.path), mediaQueryStringId + '.css');
			} else {
				fileClone.path = pathjoin(dirname(cssFile.path), fileName + '-lite.css');
			}

			stream.push(fileClone);
		});

		callback();
	});
};
