describe("notCart browser", function() {
  it("defined", function() {
    expect(notCart).to.be.ok;
    expect(notCart.notCart).to.be.ok;
  });

  it("constructable", function() {
    let cart = new notCart.notCart({
      local: true
    });
    expect(cart).to.be.ok;
  });

  describe("notCart setters/getters", function() {
    it("initCartItem", function() {
      let cart = new notCart.notCart({
        local: true
      });
      let item = {title:'id', id: 1};
      let val = cart.initCartItem(item);
      expect(val).to.be.eql({
        item:{title:'id', id: 1},
        quantity: 1
      });
    });

    it("getSaveURL, getLoadURL, getOrderURL - default", function() {
      let cart = new notCart.notCart({
        local: true
      });
      expect(cart.getAddURL()).to.be.eql('/api/cart/add');
      expect(cart.getSaveURL()).to.be.eql('/api/cart');
      expect(cart.getLoadURL()).to.be.eql('/api/cart');
      expect(cart.getOrderURL()).to.be.eql('/api/order');
    });

    it("getSaveURL, getLoadURL, getOrderURL - custom", function() {
      let cart = new notCart.notCart({
        local: true,
        addUrl: '/add',
        saveUrl: '/save',
        loadUrl: '/load',
        orderUrl: '/order',
      });
      expect(cart.getAddURL()).to.be.eql('/add');
      expect(cart.getSaveURL()).to.be.eql('/save');
      expect(cart.getLoadURL()).to.be.eql('/load');
      expect(cart.getOrderURL()).to.be.eql('/order');
    });
  });

  describe("local storage", function() {
    it('loading data from localStorage, success', () => {
      window.localStorage.setItem('cart', JSON.stringify([{
        id: 2,
        title: 'spaghetti'
      }]));
      let cart = new notCart.notCart({
        local: true
      });
      expect(cart.content).to.be.ok;
      expect(cart.content.length).to.be.eql(1);
      expect(cart.content[0].id).to.be.eql(2);
      expect(cart.content[0].title).to.be.eql('spaghetti');
      window.localStorage.setItem('cart', '');
    });

    it('loading data from localStorage, missformed JSON', () => {
      window.localStorage.setItem('cart', '<ASdfasdf>sadf');
      let cart = new notCart.notCart({
        local: true
      });
      expect(cart.content).to.be.ok;
      expect(cart.content.length).to.be.eql(0);
      expect(cart.content).to.be.eql([]);
      window.localStorage.setItem('cart', '');
    });

    it('saving data to localStorage', () => {
      window.localStorage.setItem('cart', '');
      let cart = new notCart.notCart({
        local: true
      });
      expect(cart.content).to.be.ok;
      expect(cart.content.length).to.be.eql(0);
      expect(cart.content).to.be.eql([]);
      cart.content = [{
        id: 3,
        title: 'cars'
      }];
      cart.saveToLocalStorage();
      let rawItem = window.localStorage.getItem('cart');
      let json = JSON.parse(rawItem);
      expect(json).to.be.ok;
      expect(json.length).to.be.eql(1);
      expect(json[0].id).to.be.eql(3);
      expect(json[0].title).to.be.eql('cars');
      window.localStorage.setItem('cart', '');
    });

    it('saving data to localStorage, circular cart content', (done) => {
      window.localStorage.setItem('cart', '');
      let cart = new notCart.notCart({
        local: true
      });
      expect(cart.content).to.be.ok;
      expect(cart.content.length).to.be.eql(0);
      expect(cart.content).to.be.eql([]);
      var circularObj = {};
      circularObj.circularRef = circularObj;
      circularObj.list = [ circularObj, circularObj ];
      cart.content = [circularObj];
      cart.error = ()=>{
        done();
      }
      cart.saveToLocalStorage();
      window.localStorage.setItem('cart', '');
    });

    it('saving data to localStorage from save', () => {
      window.localStorage.setItem('cart', '');
      let cart = new notCart.notCart({
        local: true
      });
      expect(cart.content).to.be.ok;
      expect(cart.content.length).to.be.eql(0);
      expect(cart.content).to.be.eql([]);
      cart.content = [{
        id: 3,
        title: 'cars'
      }];
      cart.save();
      let rawItem = window.localStorage.getItem('cart');
      let json = JSON.parse(rawItem);
      expect(json).to.be.ok;
      expect(json.length).to.be.eql(1);
      expect(json[0].id).to.be.eql(3);
      expect(json[0].title).to.be.eql('cars');
      window.localStorage.setItem('cart', '');
    });
  });

	describe("server storage", function(done) {
    it('loading data from serverStorage, success', (done) => {
      let cart = new notCart.notCart({
        local: false
      });
      cart.error = done;
      cart.loadFromServer()
        .then((data)=>{
          expect(data.length).to.be.eql(3);
          done();
        });
		});

		it('loading data from serverStorage, failure', (done) => {
      let cart = new notCart.notCart({
        local: false,
        loadUrl: '/fuckup.url',
      });
      let errorred = true;
      cart.error = ()=>{done()};
      cart.load()
        .then(()=>{
          if(!errorred){
            done(new Error('This is error'));
          }
        });
		});

		it('saving data to serverStorage, success', (done) => {
      let cart = new notCart.notCart({
        local: false
      });
      cart.error = done;
      cart.saveToServer()
        .then((data)=>{
          expect(data.ok).to.be.eql(true);
          done();
        });
		});

		it('saving data to serverStorage, failure', (done) => {
      let cart = new notCart.notCart({
        local: false,
        saveUrl: '/fuckup.url',
      });
      let errorred = true;
      cart.error = ()=>{done()};
      cart.save()
        .then(()=>{
          if(!errorred){
            done(new Error('This is error'));
          }
        });
		});

    it('ordering, success', (done) => {
      let cart = new notCart.notCart({
        local: false
      });
      cart.error = done;
      cart.orderFromServer()
        .then((data)=>{
          expect(data.ok).to.be.eql(true);
          done();
        });
		});

		it('ordering, failure', (done) => {
      let cart = new notCart.notCart({
        local: false,
        orderUrl: '/fuckup.url',
      });
        let errorred = true;
      cart.error = ()=>{
        done()
      };
      cart.orderFromServer()
        .then(()=>{
          if(!errorred){
            done(new Error('This is error'));
          }
        });
		});
	});

  describe("notCart item operations", function() {
    it("add - local", function() {
      let cart = new notCart.notCart({
        local: true
      });
      cart.add({id:333, title: 'are we happy?'});
      expect(cart.content.length).to.be.eql(1);
      expect(cart.content[0].item.id).to.be.eql(333);
    });

    it("add - server", function(done) {
      let cart = new notCart.notCart({
        local: false,
        loadUrl: '/api/cart/loadAfterAdd'
      });
      cart.add({id:333, title: 'are we happy?'})
       .then((dataNew)=>{
         expect(dataNew.length).to.be.eql(4);
         expect(dataNew[3].id).to.be.eql("this-item-id");
         expect(dataNew[3].item.id).to.be.eql(333);
         done();
       }).catch(done);
    });

    it("findById", function() {
      window.localStorage.setItem('cart', '');
      let cart = new notCart.notCart({
        local: true
      });
      cart.content.push({
        id: "item-test-id-3",
        item: {
          id: 44477,
          title: 'test 1'
        },
        quantity: 16
      });
      cart.content.push({
        id: "item-test-id-0",
        item: {
          id: 111,
          title: 'test 2'
        },
        quantity: 18
      });
      cart.content.push({
        id: "item-test-id-9",
        item: {
          id: 44,
          title: 'test_3'
        },
        quantity: 11
      });
      let target = cart.findById('item-test-id-0');
      expect(target.id).to.be.eql('item-test-id-0');
      expect(target.item.id).to.be.eql(111);
      expect(target.item.title).to.be.eql('test 2');
      target = cart.findById('item-test-id');
      expect(target).to.be.eql(false);
      cart.content = [];
      target = cart.findById('item-test-id-0');
      expect(target).to.be.eql(false);
    });

    it("changeQuantity", function() {
      window.localStorage.setItem('cart', '');
      let cart = new notCart.notCart({
        local: true
      });
      cart.content.push({
        id: "item-test-id",
        item: {
          id: 444,
          title: 'test'
        },
        quantity: 1
      });
      cart.changeQuantity('item-test-id', 777);
      expect(cart.content[0].quantity).to.be.eql(777);
      cart.changeQuantity('item-test-id', -10);
      expect(cart.content[0].quantity).to.be.eql(0);
    });

    it("list", function() {
      window.localStorage.setItem('cart', '');
      let cart = new notCart.notCart({
        local: true
      });
      cart.content.push(1);
      cart.content.push(2);
      cart.content.push(3);
      cart.content.push(4);
      expect(cart.list()).to.be.eql([1,2,3,4]);
    });

    it("remove", function() {
      window.localStorage.setItem('cart', '');
      let cart = new notCart.notCart({
        local: true
      });
      cart.content.push({
        id: "item-test-id-3",
        item: {
          id: 44477,
          title: 'test 1',
          properties: []
        },
        quantity: 16
      });
      cart.content.push({
        id: "item-test-id-0",
        item: {
          id: 111,
          title: 'test 2'
        },
        quantity: 18
      });
      cart.content.push({
        id: "item-test-id-9",
        item: {
          id: 44,
          title: 'test_3'
        },
        quantity: 11
      });
      cart.remove('item-test-id-0');
      expect(cart.content.length).to.be.eql(2);
      expect(cart.content[1].id).to.be.eql("item-test-id-9");
    });


    it("clear", function() {
      let cart = new notCart.notCart({
        local: true
      });
      cart.content = ['1','2','3','4'];
      cart.clear();
    });

    it("getOrderData", function() {
      let cart = new notCart.notCart({
        local: true
      });
      cart.content = ['test'];
      expect(cart.getOrderData()).to.be.eql(['test']);
    });

  });
});
