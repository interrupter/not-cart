const notError = require('not-error').notError,
	notLocale = require('not-locale'),
	Schema = require('mongoose').Schema;

const DEFAULT_TTL = 3; //in minutes
const DEFAULT_TTL_MIN = 1; //in minutes
const DEFAULT_TTL_MAX = 60; //in minutes
exports.DEFAULT_TTL  = DEFAULT_TTL;
exports.DEFAULT_TTL_MIN  = DEFAULT_TTL_MIN;
exports.DEFAULT_TTL_MAX  = DEFAULT_TTL_MAX;
exports.DEFAULT_ROLES_LIST = ['user', 'guest', 'client', 'admin', 'root', 'confirmed'];
exports.DEFAULT_HASH_ALGO = 'sha1';
exports.thisModelName = 'User';
exports.keepNotExtended = false;

exports.enrich = {
	versioning: true,
	increment: false,
	validators: true
};

exports.thisSchema = {
	session:{
		type: String,
		unique: true,
		searchable: false,
		required: true,
		validate: [
			{
				validator: 'isLength',
				arguments: [3, 120],
				message: 'session_length_is_not_valid'
			}
		]
	},
	username:{
		type: String,
		unique: true,
		searchable: true,
		required: true,
		validate: [
			{
				validator: 'isLength',
				arguments: [3, 60],
				message: 'username_length_is_not_valid'
			}
		]
	},
	email: {
		type: String,
		unique: true,
		searchable: true,
		required: true,
		validate: [
			{
				validator: 'isEmail',
				message: 'email_is_not_valid'
			}
		]
	},
	items:{
		type: [Schema.Types.Mixed],
		required: false,
	},
	//дата создания
	created: {
		type: Date,
		default: Date.now
	},
	ip: {
		type: String,
		required: false,
		validate: [
			{
				validator: 'isIP',
				message: 'ip_address_is_not_valid'
			}
		]
	},
	country:{
		type: String,
		required: false,
		searchable: true,
		default: 'ru',
		validate: [
			{
				validator(val){
					return val === 'ru';
				},
				message: 'selected_user_language_is_not_valid'
			}
		]
	}
};

exports.thisStatics = {
	clearFromUnsafe: (cart) =>{
		return cart;
	},
	fieldValueExists: function(key, val){
		return this.findOne({[key]: val	}).exec()
			.then((user)=>{
				return !!user;
			});
	},
	usernameExists: function (username) {
		return this.fieldValueExists('username', username);
	},
	emailExists: function (email) {
		return this.fieldValueExists('email', email);
	},
	getByFieldValue: function(key, val){
		return this.findOne({[key]: val	}).exec();
	},
	getByUsername: function (username) {
		return this.getByFieldValue('username', username);
	},
	getByEmail: function (email) {
		return this.getByFieldValue('email', email);
	},
	isUnique: function (username, email){
		return Promise.all([this.usernameExists(username), this.emailExists(email)])
			.then((results)=>{
				return ((!results[0]) && (!results[1]));
			})
			.catch((err)=>{
				throw new notError(notLocale.say('user_uniqueness_verification_error')).adopt(err);
			});
	}
};

exports.thisVirtuals = {
};

exports.thisMethods = {

};
