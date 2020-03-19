
describe('Browser mocha testing', function() {
  it('All good!', function() {
    cy.visit('http://localhost:7357/');
    cy.get('li.failures em').then(($res)=>{
      const txt = $res.text();
      expect(txt).to.eq('0');
    })
  })
})
