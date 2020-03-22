

describe('notCart browser testing', function() {
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
    cy.wait(4000);
    cy.get('li.failures em').then(($res)=>{
      const txt = $res.text();
      expect(txt).to.eq('0');
      done();
    })
  });

  it('notCart UI list, add, plus, minus, remove', function() {
    cy.visit('http://localhost:7357/cart.ui.html');
    cy.get('div.shopping-cart').then(($res)=>{
      expect($res.length).to.eq(1);
    });
    cy.get('div.shopping-cart .item').then(($res)=>{
      expect($res.length).to.eq(4);
    });
    cy.get('button.addToCart').click();
    cy.get('div.shopping-cart .item').then(($items)=>{
      expect($items.length).to.eq(5);
    });
    cy.get('div.shopping-cart .item').then(($items)=>{
      let sec = $items[1];
      sec.querySelector('.delete-btn');
      cy.get(`.delete-btn[data-id='${sec.dataset.id}']`).click();
      cy.get('div.shopping-cart .item').then(($items2)=>{
        expect($items2.length).to.eq(4);
      });
    });

    cy.get('div.shopping-cart .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.minus-btn');
      cy.get(`.minus-btn[data-id='${sec.dataset.id}']`).click();
      cy.get(`.item[data-id='${sec.dataset.id}'] .quantity>span`).should('contain', '0');
    });
    cy.get('div.shopping-cart .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.plus-btn');
      cy.get(`.plus-btn[data-id='${sec.dataset.id}']`).click();
      cy.get(`.plus-btn[data-id='${sec.dataset.id}']`).click();
      cy.get(`.plus-btn[data-id='${sec.dataset.id}']`).click();
      cy.get(`.item[data-id='${sec.dataset.id}'] .quantity>span`).should('contain', '3');
    });

    cy.get('div.shopping-cart .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.delete-btn');
      cy.get(`.delete-btn[data-id='${sec.dataset.id}']`).click();
    });

    cy.get('div.shopping-cart .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.delete-btn');
      cy.get(`.delete-btn[data-id='${sec.dataset.id}']`).click();
    });

    cy.get('div.shopping-cart .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.delete-btn');
      cy.get(`.delete-btn[data-id='${sec.dataset.id}']`).click();
    });

    cy.get('div.shopping-cart .item').then(($items)=>{
      let sec = $items[0];
      sec.querySelector('.delete-btn');
      cy.get(`.delete-btn[data-id='${sec.dataset.id}']`).click();
    });

    cy.get('div.shopping-cart .item').should('not.exist');

  })

})
