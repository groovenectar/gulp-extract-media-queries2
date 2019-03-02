var through = require('through2');
var rework = require('rework');
var split = require('rework-split-media');
var reworkMoveMedia = require('rework-move-media');
var stringify = require('css-stringify');
var cleanUpString = require('clean-up-string');
var dirname = require('path').dirname;
var pathjoin = require('path').join;
var basename = require('path').basename;

function indent(str, numOfIndents, opt_spacesPerIndent) {
	str = str.replace(/^(?=.)/gm, new Array(numOfIndents + 1).join('\t'));
	numOfIndents = new Array(opt_spacesPerIndent + 1 || 0).join(' '); // re-use
	return opt_spacesPerIndent
		? str.replace(/^\t+/g, function (tabs) {
			return tabs.replace(/./g, numOfIndents);
		})
		: str;
}

module.exports = function (filter) {
	return through.obj(function (cssFile, characterEncoding, callback) {
		var stream = this;
		var fileName = basename(cssFile.path, '.css');
		var reworkData = rework(cssFile.contents.toString()).use(reworkMoveMedia());
		var stylesheets = split(reworkData);
		var stylesheetKeys = Object.keys(stylesheets);
		var unfilteredStyles = [];

		stylesheetKeys.forEach(function (mediaQuery) {
			// Replace 兼容 min-width:768px 之类冒号后边没有空格的写法
			var mediaQueryStringId = cleanUpString(mediaQuery.replace(/:\s?/g, '-'));

			var fileClone = cssFile.clone({
				contents: false
			});

			var fileContents = stringify(stylesheets[mediaQuery]);
			fileClone.contents = new Buffer(fileContents);

			if (typeof filter === 'function' && !filter(fileName, mediaQueryStringId)) {
				unfilteredStyles.push({mediaQuery: mediaQuery, css: stylesheets[mediaQuery]});
				return;
			}

			if (mediaQueryStringId) {
				mediaQueryStringId = fileName + '-' + mediaQueryStringId;
				fileClone.path = pathjoin(dirname(cssFile.path), mediaQueryStringId + '.css');
			} else {
				fileClone.path = pathjoin(dirname(cssFile.path), fileName + '.css');
			}

			stream.push(fileClone);
		});

		if (unfilteredStyles.length) {
			var fileClone = cssFile.clone({
				fileContents: false
			});

			var fileContents = '';

			unfilteredStyles.forEach(function (unfilteredStyle) {
				if (unfilteredStyle.mediaQuery) {
					fileContents += '@media ' + unfilteredStyle.mediaQuery + ' {' + "\n\t" +
						indent(stringify(unfilteredStyle.css), 1) + "\n" +
						'}' + "\n";
				} else {
					fileContents += stringify(unfilteredStyle.css);
				}
			});

			fileClone.contents = new Buffer(fileContents);
			fileClone.path = pathjoin(dirname(cssFile.path), fileName + '.css');

			stream.push(fileClone);
		}

		callback();
	});
};
