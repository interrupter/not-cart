//import "../styles/common/common.css";
import "./cart.scss";

const OPT_DEFAULT_ANIMATION_DURATION = 600;
const SELECTOR_CART_OVERLAY_ID = 'cart-overlay';
const STR_CART_CONTENT_LIST_TITLE = 'Ваша корзина';
const STR_CART_ORDER_FORM_TITLE = 'Оформление заказа';
const STR_CART_ORDER_SUBMIT_CAPTION = 'Отправить';

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
			this.options.title = STR_CART_CONTENT_LIST_TITLE;
		}
		if (!this.options.titleOrder) {
			this.options.titleOrder = STR_CART_ORDER_FORM_TITLE;
		}
		if (!this.options.submitOrderCaption) {
			this.options.submitOrderCaption = STR_CART_ORDER_SUBMIT_CAPTION;
		}
		if (!this.options.moneySign) {
			this.options.moneySign = '&#8381;';
		}

		this.addFixedCountIcon();
		this.initCartCounters();
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
				this.content.forEach((item) => {
					if (!item.id) {
						item.id = 'id-' + Math.random();
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
			let existed = this.findByProductId(item.id);
			if (existed){
				this.changeQuantity(existed.id, existed.quantity + 1);
			}else{
				this.content.push(this.initCartItem(item));
			}
			this.updateItemCounters();
			return this.saveToLocalStorage();
		} else {
			return this.addToServer(item)
				.then(this.loadFromServer.bind(this))
				.then((data) => {
					this.updateItemCounters();
					return data;
				})
				.catch(this.error);
		}
	}

	findByProductId(id){
		for (let item of this.content) {
			if (item.item.id == id) {
				return item;
			}
		}
		return false;
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
			this.updateItemCounters();
			return this.save();
		} else {
			throw new Error('Item is not in the cart!');
		}
	}

	getCount() {
		return this.content.length;
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
		let cartOverlay = document.body.querySelector('#' + SELECTOR_CART_OVERLAY_ID);
		if (!cartOverlay) {
			cartOverlay = document.createElement('div');
			cartOverlay.innerHTML = `<div><header class="header"></header><main></main><footer></footer></div>`;
			cartOverlay.id = SELECTOR_CART_OVERLAY_ID;
			cartOverlay.classList.add('cart-overlay');
			cartOverlay.classList.add('show');
			document.body.appendChild(cartOverlay);
			cartOverlay.querySelector('main').addEventListener('click', (e)=>{
				if (e.explicitOriginalTarget === e.currentTarget && e.currentTarget.tagName === 'MAIN'){
					this.hideOverlay();
				}
			});
		}
		if (!cartOverlay.classList.contains('show')) {
			cartOverlay.classList.add('show');
		}
		document.body.classList.add('overlayed');
		this.overlayVisible = true;
		return cartOverlay;
	}

	hideOverlay() {
		this.removeOverlay();
	}

	removeOverlay() {
		let cartOverlay = document.body.querySelector('#' + SELECTOR_CART_OVERLAY_ID);
		cartOverlay.remove();
		this.overlayVisible = false;
	}

	getOverlayInner() {
		return document.body.querySelector(`#${SELECTOR_CART_OVERLAY_ID} main`);
	}

	getEmptyCaption() {
		return '<div class="empty-cart">Пуста</div>';
	}

	renderItem(item) {
		let description = this.prepareItemDescription(item);
		let priceItem = this.formatPrice(parseFloat(item.item.price) * parseInt(item.quantity));
		return `<div class="item" data-id="${item.id}">
			<div class="buttons">
				<span class="delete-btn" data-id="${item.id}"></span>
			</div>
			<div class="cart-item-title"><a href="${item.item.url}">${item.item.title}</a></div>
			<div class="image">
				<img src="${item.item.image}" alt="${item.item.title}" />
			</div>
			<div class="description">${description}</div>
			<div class="quantity">
				<span class="minus-btn" type="button" name="button" data-id="${item.id}">&nbsp;</span><span class="number">${item.quantity}</span><span class="plus-btn" type="button" name="button"  data-id="${item.id}">&nbsp;</span>
			</div>
			<div class="total-price">${priceItem}</div>
		</div>`;
	}

	prepareItemDescription(item) {
		let descFunc = this.description_full.bind(this);
		if (this.options.descriptionStyle) {
			switch (this.options.descriptionStyle) {
			case 'plain':
				descFunc = this.description_plain.bind(this);
				break;
			}
		}
		return descFunc(item);
	}

	description_full(item) {
		let result = '';
		Array.isArray(item.item.properties) && item.item.properties.forEach(
			(prop) => {
				result += `<span class="cart-item-property"><span class="cart-item-property-title">${prop.title}:</span> <span class="cart-item-property-value">${prop.value}</span></span>`;
			}
		);
		return result;
	}

	description_plain(item) {
		let result = [];
		Array.isArray(item.item.properties) && item.item.properties.forEach(
			(prop) => {
				result.push(`<span class="cart-item-property-value">${prop.value}</span>`);
			}
		);
		return result.join(', ');
	}

	showList() {
		this.showOverlay();
		this.updateContentList();
	}

	updateContentList() {
		let cont = this.getOverlayInner();
		if (this.overlayVisible && cont) {
			let products = this.content.map(this.renderItem.bind(this)).join('');
			cont.innerHTML = `
			<div class="shopping-cart">
				<span class="close-btn"></span>
				<div class="title">${this.options.title}
					<span class="total-shop-cart"></span>
					<span class="cart-order-btn"  type="button">Заказать</span>
				</div>
				<div class="cart-list">${products}</div>
			</div>`;
			this.bindItemsActions();
			this.initCartOrderButtons();
			this.updateContentListTitle();
		}
	}

	updateContentListTitle() {
		let price = this.totalPriceFormated(),
			qty = this.totalQuantity(),
			str = '',
			cont = document.querySelector('.shopping-cart .total-shop-cart'),
			list = document.querySelector('.shopping-cart .cart-list');
		if (this.content.length) {
			str = `Всего товаров: ${qty}, общей стоимостью: <span class="total-price">${price}</span>`;
		} else {
			list.innerHTML = this.getEmptyCaption();
		}
		if (this.totalPrice() > 0) {
			Array.from(document.querySelectorAll('.shopping-cart .cart-order-btn')).forEach(el => el.classList.remove('disabled'));
		} else {
			Array.from(document.querySelectorAll('.shopping-cart .cart-order-btn')).forEach(el => el.classList.add('disabled'));
		}
		cont.innerHTML = str;
	}

	bindItemsActions() {
		let items = document.body.querySelectorAll('.shopping-cart .item');
		items.forEach(this.bindItemActions.bind(this));
		let closeBtn = document.body.querySelector('.shopping-cart .close-btn');
		closeBtn.addEventListener('click', this.hideOverlay.bind(this));
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
		e && e.preventDefault() && e.stopPropagation();
		let id = e.currentTarget.dataset.id;
		this.remove(id)
			.then(() => this.removeItemElement(id))
			.then(() => this.updateContentListTitle())
			.catch(this.error);
		return true;
	}

	removeItemElement(id) {
		if (this.content.length) {
			let el = document.querySelector(`.shopping-cart .item[data-id="${id}"]`);
			el.parentNode.removeChild(el);
		} else {
			this.updateContentList();
		}
	}

	minusItemClick(e) {
		e && e.preventDefault() && e.stopPropagation();
		let id = e.currentTarget.dataset.id,
			cartItem = this.findById(id);
		this.changeQuantity(id, cartItem.quantity - 1)
			.then(() => this.updateItemQuantity(id))
			.then(() => this.updateContentListTitle())
			.catch(this.error);
		return true;
	}

	plusItemClick(e) {
		e && e.preventDefault() && e.stopPropagation();
		let id = e.currentTarget.dataset.id,
			cartItem = this.findById(id);
		this.changeQuantity(id, cartItem.quantity + 1)
			.then(() => this.updateItemQuantity(id))
			.then(() => this.updateContentListTitle())
			.catch(this.error);
		return false;
	}

	updateItemQuantity(id) {
		let el = document.querySelector(`.shopping-cart .item[data-id="${id}"] .quantity span.number`);
		el.innerHTML = this.findById(id).quantity;
		return this;
	}

	totalPrice() {
		let total = 0;
		this.content.forEach((item) => {
			total += (item.quantity * item.item.price);
		});
		return total;
	}

	totalQuantity() {
		let total = 0;
		this.content.forEach((item) => {
			total += item.quantity;
		});
		return total;
	}

	totalPriceFormated() {
		return this.formatPrice(this.totalPrice());
	}

	formatPrice(price) {
		let rub = parseInt(Math.floor(price / 100)),
			cop = parseInt(price % 100);
		rub = '' + rub;
		return `${this.options.moneySign}${rub}.${cop}`;
	}

	updateItemCounters() {
		let count = this.getCount(),
			dur = this.getAnimationDuration();
		Array.from(document.querySelectorAll('.cart-icon-count')).forEach((el) => {
			el.textContent = count;
			el.classList.add('updated');
			setTimeout(() => {
				el.classList.remove('updated');
			}, dur);
		});
	}

	initCartCounters() {
		Array.from(document.querySelectorAll('.cart-icon-fixed')).forEach((el) => {
			el.addEventListener('click', this.externalEventOpenClick.bind(this));
		});
	}

	externalEventOpenClick(e) {
		e.preventDefault();
		this.showList();
		return false;
	}

	getAnimationDuration() {
		return this.options.getAnimationDuration ? this.options.getAnimationDuration : OPT_DEFAULT_ANIMATION_DURATION;
	}

	initCartOrderButtons() {
		Array.from(document.querySelectorAll('.shopping-cart .cart-order-btn')).forEach((el) => el.addEventListener('click', this.orderClick.bind(this)));
	}

	orderClick(e) {
		e && e.preventDefault();
		if ((this.totalPrice() > 0) && (typeof this.options.onOrder === 'function')) {
			this.removeOverlay();
			this.options.onOrder(this.getOrderData());
		}
	}

	addFixedCountIcon() {
		let el = document.createElement('div');
		el.innerHTML = `<a href="#" class="cart-icon-fixed"><span class="cart-icon-count">0</span></a>`;
		document.body.appendChild(el);
		this.countIconElement = el;
	}
}

export default notCart;
