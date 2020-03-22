class notCart {
	constructor(options) {
		this.options = options;
		this.init();
		return;
	}

	init() {
		this.content = [];
		this.error = this.reportError.bind(this);
		if (!this.options.title) {
			this.options.title = 'Ваша корзина';
		}
		this.load();
	}

	reportError(e) {
		//eslint-disable-next-line no-console
		console.error(e);
	}

	isLocal() {
		return !!this.options.local;
	}

	save() {
		if (this.isLocal()) {
			return this.saveToLocalStorage();
		} else {
			return this.saveToServer();
		}
	}

	load() {
		if (this.isLocal()) {
			return this.loadFromLocalStorage();
		} else {
			return this.loadFromServer();
		}
	}

	loadFromLocalStorage() {
		/* istanbul ignore else */
		if (window.localStorage) {
			this.content = [];
			try {
				let cartRaw = window.localStorage.getItem('cart');
				let cartData = JSON.parse(cartRaw);
				if (Array.isArray(cartData)) {
					this.content = cartData;
				}
				return;
			} catch (e) {
				this.content = [];
				this.error(e);
				return;
			}
		} else {
			throw new Error('Local Storage API is absent!');
		}
	}

	saveToLocalStorage() {
		/* istanbul ignore else */
		if (window.localStorage) {
			try {
				this.content.forEach((item)=>{
					if(!item.id){
						item.id = 'id-'+Math.random();
					}
				});
				let cartRaw = JSON.stringify(this.content);
				window.localStorage.setItem('cart', cartRaw);
				return Promise.resolve();
			} catch (e) {
				this.error(e);
				return Promise.reject(e);
			}
		} else {
			throw new Error('Local Storage API is absent!');
		}
	}

	initCartItem(item) {
		return {
			item,
			quantity: 1,
		};
	}

	add(item) {
		if (this.isLocal()) {
			this.content.push(this.initCartItem(item));
			return this.saveToLocalStorage();
		} else {
			return this.addToServer(item).then(this.loadFromServer.bind(this)).catch(this.error);
		}
	}

	findById(id) {
		for (let item of this.content) {
			if (item.id === id) {
				return item;
			}
		}
		return false;
	}

	changeQuantity(id, qty) {
		qty = parseInt(qty);
		if (qty < 0) {
			qty = 0;
		}
		if (Array.isArray(this.content)) {
			let item = this.findById(id);
			if (item) {
				item.quantity = qty;
			}
			return this.save();
		} else {
			throw new Error('Cart content is not valid!');
		}
	}

	remove(id) {
		let item = this.findById(id);
		if (this.content.indexOf(item) > -1) {
			this.content.splice(this.content.indexOf(item), 1);
			return this.save();
		} else {
			throw new Error('Item is not in the cart!');
		}
	}

	list() {
		return this.content;
	}

	clear() {
		this.content.splice(0, this.content.length);
		return this.save();
	}

	getOrderData() {
		return this.content;
	}

	getStandartRequestOptions() {
		return {
			mode: 'cors', // no-cors, *cors, same-origin
			cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
			credentials: 'same-origin', // include, *same-origin, omit
			headers: {
				'Content-Type': 'application/json'
			},
			redirect: 'error', // manual, *follow, error
			referrerPolicy: 'no-referrer', // no-referrer, *client
		};
	}

	async putData(url, data) {
		let opts = this.getStandartRequestOptions();
		const response = await fetch(url, Object.assign(opts, {
			method: 'PUT', // *GET, POST, PUT, DELETE, etc.
			body: JSON.stringify(data) // body data type must match "Content-Type" header
		}));
		return await response.json(); // parses JSON response into native JavaScript objects
	}

	async postData(url, data) {
		let opts = this.getStandartRequestOptions();
		const response = await fetch(url, Object.assign(opts, {
			method: 'POST', // *GET, POST, PUT, DELETE, etc.
			body: JSON.stringify(data) // body data type must match "Content-Type" header
		}));
		return await response.json(); // parses JSON response into native JavaScript objects
	}

	async getData(url) {
		let opts = this.getStandartRequestOptions();
		const response = await fetch(url, Object.assign(opts, {
			method: 'GET'
		}));
		return await response.json(); // parses JSON response into native JavaScript objects
	}

	getAddURL() {
		return this.options.addUrl ? this.options.addUrl : '/api/cart/add';
	}

	getSaveURL() {
		return this.options.saveUrl ? this.options.saveUrl : '/api/cart';
	}

	getLoadURL() {
		return this.options.loadUrl ? this.options.loadUrl : '/api/cart';
	}

	getOrderURL() {
		return this.options.orderUrl ? this.options.orderUrl : '/api/order';
	}

	addToServer(item) {
		return this.putData(this.getAddURL(), item).then(this.showAddResponse.bind(this)).catch(this.error);
	}

	saveToServer() {
		return this.putData(this.getSaveURL(), this.content).then(this.showSaveResponse.bind(this)).catch(this.error);
	}

	loadFromServer() {
		return this.getData(this.getLoadURL()).then((data) => {
			this.content = data;
			return data;
		}).catch(this.error);
	}

	orderFromServer() {
		return this.postData(this.getOrderURL(), this.getOrderData())
			.then(this.showOrderResponse.bind(this)).catch(this.error);
	}

	showAddResponse(data) {
		return data;
	}

	showSaveResponse(data) {
		return data;
	}

	showOrderResponse(data) {
		return data;
	}

	showOverlay() {
		let cartOverlay = document.body.querySelector('#cart-overlay');
		if (!cartOverlay) {
			cartOverlay = document.createElement('div');
			cartOverlay.innerHTML = '<div><header></header><main></main><footer></footer></div>';
			cartOverlay.id = 'cart-overlay';
			cartOverlay.classList.add('show');
			document.body.appendChild(cartOverlay);
		}
		if (!cartOverlay.classList.contains('show')) {
			cartOverlay.classList.add('show');
		}
		document.body.classList.add('overlayed');
		this.overlayVisible = true;
		return cartOverlay;
	}

	hideOverlay() {
		let cartOverlay = document.body.querySelector('#cart-overlay');
		if (cartOverlay.classList.contains('show')) {
			cartOverlay.classList.remove('show');
		}
		cartOverlay.innerHTML = '';
		document.body.classList.remove('overlayed');
		this.overlayVisible = false;
	}

	getOverlayInner() {
		return document.body.querySelector('#cart-overlay main');
	}

	renderItem(item) {
		let priceItem = (parseFloat(item.item.price) * parseInt(item.quantity)).toFixed(2);
		return `<div class="item" data-id="${item.id}">
      <div class="buttons">
        <span class="delete-btn" data-id="${item.id}"></span>
      </div>
      <div class="image">
        <img src="${item.item.image}" alt="${item.item.title}" />
      </div>
      <div class="description">${item.item.description}</div>
      <div class="quantity">
        <button class="minus-btn" type="button" name="button" data-id="${item.id}">
          <img src="/dist/img/minus.svg" alt="" />
        </button>
        <span>${item.quantity}</span>
        <button class="plus-btn" type="button" name="button"  data-id="${item.id}">
            <img src="/dist/img/plus.svg" alt="" />
          </button>
      </div>
      <div class="total-price">${priceItem}</div>
    </div>`;
	}

	showList() {
		this.showOverlay();
		this.updateList();
	}

	updateList() {
		let cont = this.getOverlayInner();
		if(this.overlayVisible && cont){
			let products = this.content.map(this.renderItem.bind(this)).join('');
			cont.innerHTML = `<div class="shopping-cart"><div class="title">${this.options.title}</div><div class="cart-list">${products}</div></div>`;
			this.bindItemsActions();
		}
	}

	bindItemsActions() {
		let items = document.body.querySelectorAll('.shopping-cart .item');
		items.forEach(this.bindItemActions.bind(this));
	}

	bindItemActions(item) {
		let
			deleteBtn = item.querySelector('.delete-btn'),
			minusBtn = item.querySelector('.minus-btn'),
			plusBtn = item.querySelector('.plus-btn');
		deleteBtn.addEventListener('click', this.removeItemClick.bind(this));
		minusBtn.addEventListener('click', this.minusItemClick.bind(this));
		plusBtn.addEventListener('click', this.plusItemClick.bind(this));
	}

	removeItemClick(e) {
		e && e.preventDefault();
		let id = e.currentTarget.dataset.id;
		this.remove(id)
			.then(this.updateList.bind(this))
			.catch(this.error);
		return false;
	}

	minusItemClick(e) {
		e && e.preventDefault();
		let id = e.currentTarget.dataset.id,
			cartItem = this.findById(id);
		this.changeQuantity(id, cartItem.quantity - 1)
			.then(this.updateList.bind(this))
			.catch(this.error);
		return false;
	}

	plusItemClick(e) {
		e && e.preventDefault();
		let id = e.currentTarget.dataset.id,
			cartItem = this.findById(id);
		this.changeQuantity(id, cartItem.quantity + 1)
			.then(this.updateList.bind(this))
			.catch(this.error);
		return false;
	}
}

export default notCart;
