module.exports = {
	model: 'cart',
	url: '/api/:modelName',
	showMessages: true,
	fields: {
		fName: {
			type: 'text',
			placeholder: 'Фамилия'
		},
		iName: {
			type: 'text',
			placeholder: 'Имя'
		},
		oName: {
			type: 'text',
			placeholder: 'Отчество'
		},
		dateOfBirth: {
			type: 'date',
			placeholder: 'Дата рождения'
		},
		phone: {
			type: 'tel',
			placeholder: 'Телефон'
		},
		username: {
			type: 'text',
			placeholder: 'Имя пользователя'
		},
		email: {
			type: 'email',
			label: 'Email',
			placeholder: 'Email'
		},
		status: {
			type: 'status',
			label: 'Статус'
		},
		submit: {
			type: 'submit',
			target: 'footer'
		},
	},
	actions:{
		/**
		Guest action
		**/
		load:{
			method: 'get',
			rules:[{auth: false}, {auth: true}],
			postFix: '/:actionName'
		},
    add:{
			method: 'post',
			rules:[{auth: false}, {auth: true}],
			postFix: '/:actionName',
			messages: {
				success: 'Товар добавлен!'
			}
		},
    remove:{
			method: 'post',
			rules:[{auth: false}, {auth: true}],
			postFix: '/:actionName',
			messages: {
				success: 'Товар удален!'
			}
		},
    change:{
			method: 'post',
			rules:[{auth: false}, {auth: true}],
			postFix: '/:actionName',
			messages: {
				success: 'Корзина обновлена!'
			}
		},
    order:{
			method: 'post',
			rules:[{auth: false}, {auth: true}],
			postFix: '/:actionName',
			messages: {
				success: 'Заказ оформлен!'
			}
		},
    /**
    * Manager actions
    **/
		list:{
			method: 'GET',
			rules:{
				auth: true,
				admin: false,
        role: ['admin', 'manager']
			},
			postFix: '/:actionName'
		},
    update:{
			method: 'POST',
      rules:{
				auth: true,
				admin: false,
        role: ['admin', 'manager']
			},
			postFix: '/:actionName',
			messages: {
				success: 'Корзина обновлена!'
			}
		},
    delete:{
			method: 'DELETE',
      rules:{
				auth: true,
				admin: false,
        role: ['admin', 'manager']
			},
			postFix: '/:actionName',
			messages: {
				success: 'Корзина удалена!'
			}
		},
	}
};
