var notCart = (function () {
	'use strict';

	class notCart {
	  constructor(options) {
	    this.options = options;
	    this.init();
	    return;
	  }

	  init() {
	    this.content = [];
	    this.error = this.reportError.bind(this);
	    this.load();
	  }

	  reportError(e) {
	    //eslint-disable-next-line no-console
	    console.error(e);
	  }

	  isLocal() {
	    return !!this.options.local;
	  }

	  load() {
	    if (this.isLocal()) {
	      this.loadFromLocalStorage();
	    } else {
	      this.loadFromServer();
	    }
	  }

	  loadFromLocalStorage() {
	    if (window.localStorage) {
	      this.content = [];

	      try {
	        let cartRaw = window.localStorage.getItem('cart');
	        let cartData = JSON.parse(cartRaw);
	        this.content = cartData;
	      } catch (e) {
	        this.error(e);
	      }
	    } else {
	      throw new Error('Local Storage API is absent!');
	    }
	  }

	  loadFromServer() {}

	  save() {
	    if (this.isLocal()) {
	      this.saveToLocalStorage();
	    } else {
	      this.saveToServer();
	    }
	  }

	  saveToLocalStorage() {
	    if (window.localStorage) {
	      try {
	        let cartRaw = JSON.stringify(this.content);
	        window.localStorage.setItem('cart', cartRaw);
	      } catch (e) {
	        this.error(e);
	      }
	    } else {
	      throw new Error('Local Storage API is absent!');
	    }
	  }

	  saveToServer() {
	    this.postData(this.getSaveURL(), this.content).then(data => {
	      this.showSaveResponse(data);
	    }).catch(this.error);
	  }

	  add(item) {
	    if (this.isLocal()) {
	      this.content.push(item);
	      this.save();
	    } else {
	      this.addToServer(item).then(this.loadFromServer.bind(this)).catch(this.error);
	    }
	  }

	  update(key, val, newVal) {
	    if (Array.isArray(this.content)) {
	      let res = this.content.filter(item => item[key] === val);

	      if (res && res.length) {
	        let target = res[0];

	        for (let t in newVal) {
	          target[t] = newVal[t];
	          target.edited = true;
	        }

	        this.save();
	      }
	    } else {
	      throw new Error('Cart content is not valid!');
	    }
	  }

	  remove(item) {
	    if (this.content.indexOf(item) > -1) {
	      this.content.splice(this.content.indexOf(item), 1);
	      this.save();
	    }
	  }

	  find() {}

	  list() {}

	  clear() {}

	  renderButton() {}

	  renderDropMenu() {}

	  renderPage() {}

	  async postData(url = '', data = {}) {
	    // Default options are marked with *
	    const response = await fetch(url, {
	      method: 'POST',
	      // *GET, POST, PUT, DELETE, etc.
	      mode: 'cors',
	      // no-cors, *cors, same-origin
	      cache: 'no-cache',
	      // *default, no-cache, reload, force-cache, only-if-cached
	      credentials: 'same-origin',
	      // include, *same-origin, omit
	      headers: {
	        'Content-Type': 'application/json'
	      },
	      redirect: 'follow',
	      // manual, *follow, error
	      referrerPolicy: 'no-referrer',
	      // no-referrer, *client
	      body: JSON.stringify(data) // body data type must match "Content-Type" header

	    });
	    return await response.json(); // parses JSON response into native JavaScript objects
	  }

	  getSaveURL() {
	    return this.options.saveUrl ? this.options.saveUrl : '/api/cart/save';
	  }

	  getOrderURL() {
	    return this.options.orderUrl ? this.options.orderUrl : '/api/cart/order';
	  }

	}

	return notCart;

}());
