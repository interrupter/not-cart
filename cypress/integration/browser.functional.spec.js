const beforeAdd = [
  {
    "id": "item-1",
    "item": {
      "id": 1,
      "title": "test item 1"
    },
    "quantity": 1
  },
  {
    "id": "item-1232",
    "item": {
      "id": 2,
      "title": "test item 11"
    },
    "quantity": 2
  },
  {
    "id": "item-10",
    "item": {
      "id": 3,
      "title": "test item 111"
    },
    "quantity": 3
  }
]
;

let afterAdd = [
  {
    "id": "item-1",
    "item": {
      "id": 1,
      "title": "test item 1"
    },
    "quantity": 1
  },
  {
    "id": "item-1232",
    "item": {
      "id": 2,
      "title": "test item 11"
    },
    "quantity": 2
  },
  {
    "id": "item-10",
    "item": {
      "id": 3,
      "title": "test item 111"
    },
    "quantity": 3
  },
  {
    "id": "this-item-id",
    "item":{
      "id":333,
      "title": "are we happy?"
    },
    "quantity": 1
  }
];

describe('notCart browser testing', function() {
  before(() => {
    cy.exec('npm run buildtest');
  });

  it('notCart functions', function(done) {
    cy.intercept('GET', '/api/cart', beforeAdd);
    cy.intercept('GET', '/api/cart/loadAfterAdd', afterAdd);
    cy.intercept('PUT', '/api/cart', {
      "ok": true
    }
);
    cy.intercept('PUT', '/api/cart/add', {
      "ok": true,
      "id": "this-item-id"
    }
);
    cy.intercept('POST', '/api/order', {
      "ok": true
    }
);
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
