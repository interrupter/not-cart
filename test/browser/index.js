describe("notCart browser", function() {
	it("defined", function() {
		expect(notCart).to.be.ok;
	});
	it("constructable", function() {
		console.log(notCart);
		let cart = new notCart({});
		expect(cart).to.be.ok;
	});
});
