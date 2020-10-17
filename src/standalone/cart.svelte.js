//import "../styles/common/common.css";
import CartComponent from './cart.svelte';
import CartItemComponent from './cart.item.svelte';
import CartIconComponent from './cart.icon.svelte';
import { writable } from 'svelte/store';

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
    this.ui = {
      cart: null,
      icon: null
    };
    this.content = writable([]);
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

    this.initUICartCountIcon();
    this.initUICart();
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
        this.updateUICounters();
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
        this.updateUICounters();
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
      let existed = this.findSameProduct(item, true);
      if (existed) {
        this.changeQuantity(existed.id, existed.quantity + 1);
      } else {
        this.content.push(this.initCartItem(item));
      }
      this.updateUICounters();
      this.updateUICart();
      return this.saveToLocalStorage();
    } else {
      return this.addToServer(item)
        .then(this.loadFromServer.bind(this))
        .then((data) => {
          this.updateUICounters();
          this.updateUICart();
          return data;
        })
        .catch(this.error);
    }
  }

  getPropsString(item){
  	return JSON.stringify(item.properties);
  }

  findSameProduct(newItem, props = true){
    let existing = this.findByProductId(newItem.id);
    if(!existing){ return false; }
    if(props){
      let propsString = this.getPropsString(newItem);
      for(let oldItem of existing){
        if(propsString === this.getPropsString(oldItem.item)){
          return oldItem;
        }
      }
    }else{
      return props;
    }
    return false;
  }

  findByProductId(id){
    let copies = [];
    for (let item of this.content) {
      if (item.item.id == id) {
        copies.push(item);
      }
    }
    if(copies.length === 0){
      return false;
    }else{
      return copies;
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
      this.updateUICounters();
      this.updateUICart();
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
      this.updateUICounters();
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

  initUICartCountIcon() {
    this.ui.icon = new CartIconComponent({
      target: document.body,
      props:{
        count: this.content.length
      }
    });
    this.ui.icon.$on('click', this.showList.bind(this));
	}

  initUICart() {
    this.ui.cart = new CartComponent({
      target: document.body,
      props: {
        show: false,
        content: this.content,
        title: this.options.title
      }
    });
    this.ui.cart.$on('quantity.change', ev => this.changeQuantity(ev.detail.id, ev.detail.quantity));
    this.ui.cart.$on('item.remove', ev => this.remove(ev.detail.id) );
    this.ui.cart.$on('order', this.orderClick.bind(this));
	}

  updateUICounters() {
		let count = this.getCount();
    if(this.ui.icon){
      this.ui.icon.$set({count});
    }
	}

  updateUICart(){
    if(this.ui.cart){
      this.ui.cart.$set({updateNow: Math.random()});
    }
  }

  getTotalPrice() {
		let func = (total, item) => (total + (item.quantity * item.item.price));
		return	this.content.length?this.content.reduce(func, 0):0;
	}

	getTotalQuantity() {
		let func = (total, item) => total + item.quantity;
		return	this.content.length?this.content.reduce(func, 0):0;
	}

  orderClick(e) {
		e && e.preventDefault();
		if ((this.getTotalPrice() > 0) && (typeof this.options.onOrder === 'function')) {
			this.hideOverlay();
			this.options.onOrder(this.getOrderData());
		}
	}

	getAnimationDuration() {
		return this.options.getAnimationDuration ? this.options.getAnimationDuration : OPT_DEFAULT_ANIMATION_DURATION;
	}

  showOverlay() {
		this.ui.cart.$set({
      show: true,
      content: this.content
    });
	}

	hideOverlay() {
		this.ui.cart.$set({show: false});
	}

	removeOverlay() {
		this.ui.cart.$destroy();
	}

  showList() {
		this.showOverlay();
	}

}

export {
  notCart,
  CartIconComponent,
  CartItemComponent,
  CartComponent
};
