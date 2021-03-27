const path = require('path');

module.exports = {
	name: 'not-cart',
	paths: {
		routes:				path.join(__dirname, 'src', 'routes'),
		controllers:	path.join(__dirname, 'src', 'controllers'),
		views:				path.join(__dirname, 'src', 'views'),
		models:				path.join(__dirname, 'src', 'models'),
		locales:			path.join(__dirname, 'src', 'locales')
	}
};
