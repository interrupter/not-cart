

describe('notCart browser testing', function() {
  before(async () => {
    await cy.exec('npm run buildtest');
  });

  it('notCart functions', function(done) {
    cy.server({
      delay: 10
    });
    cy.route('GET', '/api/cart', 'fixture:cart.load.json');
    cy.route('GET', '/api/cart/loadAfterAdd', 'fixture:cart.load.after.add.json');
    cy.route('PUT', '/api/cart', 'fixture:cart.save.json');
    cy.route('PUT', '/api/cart/add', 'fixture:cart.add.json');
    cy.route('POST', '/api/order', 'fixture:cart.order.json');
    cy.visit('http://localhost:7357/');
    cy.wait(2000);
    cy.get('li.failures em').then(($res)=>{
      const txt = $res.text();
      expect(txt).to.eq('0');
      done();
    })
  });

  it('notCart UI list, add, plus, minus, remove, hide list', function() {
    cy.visit('http://localhost:7357/cart.ui.html');

    cy.get('div.cart-list-items-paper').should('not.exist');
    cy.get('div.cart-list-items-paper .item').should('not.exist');

    cy.get('button.showCart').click();

    cy.get('div.cart-list-items-paper').should('exist');
    cy.get('div.cart-list-items-paper .item').should('exist');

    cy.get('div.cart-list-items-paper').then(($res)=>{
      expect($res.length).to.eq(1);
    });
    cy.get('div.cart-list-items-paper .item').then(($res)=>{
      expect($res.length).to.eq(4);
    });

    cy.get('div.cart-list-items-paper .cart-form-close').click();

    cy.get('div.cart-list-items-paper').should('not.exist');
    cy.get('div.cart-list-items-paper .item').should('not.exist');

    cy.get('button.addToCart').click();
    cy.get('button.showCart').click();

    cy.get('div.cart-list-items-paper').should('exist');
    cy.get('div.cart-list-items-paper .item').should('exist');

    cy.get('div.cart-list-items-paper .item').then(($items)=>{
      expect($items.length).to.eq(5);
    });

    cy.get('div.cart-list-items-paper .item').then(($items)=>{
      let sec = $items[1];
      sec.querySelector('.item-remove-btn button');
      cy.get(`.item[data-id='${sec.dataset.id}'] .item-remove-btn button`).click();
      cy.get('div.cart-list-items-paper .item').then(($items2)=>{
        expect($items2.length).to.eq(4);
      });
    });

    cy.get('div.cart-list-items-paper .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.minus-btn');
      cy.get(`.item[data-id='${sec.dataset.id}'] .minus-btn`).click();
      cy.get(`.item[data-id='${sec.dataset.id}'] .quantity>span`).should('contain', '0');
    });
    cy.get('div.cart-list-items-paper .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.plus-btn');
      cy.get(`.item[data-id='${sec.dataset.id}'] .plus-btn`).click();
      cy.get(`.item[data-id='${sec.dataset.id}'] .plus-btn`).click();
      cy.get(`.item[data-id='${sec.dataset.id}'] .plus-btn`).click();
      cy.get(`.item[data-id='${sec.dataset.id}'] .quantity>span`).should('contain', '3');
    });

    cy.get('div.cart-list-items-paper .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.item-remove-btn button');
      cy.get(`.item[data-id='${sec.dataset.id}'] .item-remove-btn button`).click();
    });

    cy.get('div.cart-list-items-paper .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.item-remove-btn button');
      cy.get(`.item[data-id='${sec.dataset.id}'] .item-remove-btn button`).click();
    });

    cy.get('div.cart-list-items-paper .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.item-remove-btn button');
      cy.get(`.item[data-id='${sec.dataset.id}'] .item-remove-btn button`).click();
    });

    cy.get('div.cart-list-items-paper .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.item-remove-btn button');
      cy.get(`.item[data-id='${sec.dataset.id}'] .item-remove-btn button`).click();
    });
    cy.get('div.cart-list-items-paper .item').should('not.exist');

    cy.get('div.cart-list-items-paper .cart-form-close').click();

    cy.get('#footer').scrollIntoView();
    cy.get('button.showCart').click();
    cy.get('div.cart-list-items-paper').should('be.visible');
  });


})
