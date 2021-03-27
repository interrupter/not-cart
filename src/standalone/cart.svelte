<script>
	let overlay;

	import NotCartItem from './cart.item.svelte';
	import {
		UIOverlay,
		UIButton
	} from 'not-bulma';

	import {createEventDispatcher} from 'svelte';
	let dispatch = createEventDispatcher();

	export let totalQuantity = 0;
	export let totalPrice = 0;

	export let closeOnClick = true;
	export let closeButton = false;
	export let content = [];
	export let show = false;
	export let moneySign = '&#8381;';
	export let title = 'Ваша корзина';
	export let updateNow = 0;

	export let update = () => {
		content = content;
	}

	let isEmpty = false;

	$: {
		show,
		updateNow,
		update();
	}

	function overlayClosed() {
		overlay.$set({
			show: false
		});
	}

	function formatPrice(price) {
		let rub = parseInt(Math.floor(price / 100)),
			cop = parseInt(price % 100);
		rub = '' + rub;
		return `${moneySign}${rub}.${cop}`;
	}

	function getTotalPrice() {
		let func = (total, item) => (total + (item.quantity * item.item.price));
		return content.length ? content.reduce(func, 0) : 0;
	}

	function getTotalQuantity() {
		let func = (total, item) => total + item.quantity;
		return content.length ? content.reduce(func, 0) : 0;
	}

	function updateTotals() {
		totalQuantity = getTotalQuantity();
		totalPrice = formatPrice(getTotalPrice());
		isEmpty = (totalQuantity === 0);
	}

	function onItemQuantityChange(ev) {
		dispatch('quantity.change', ev.detail);
		updateTotals();
	}

	function onItemRemove(ev) {
		dispatch('item.remove', ev.detail);
		updateTotals();
	}

	function closeCart() {
		show = false;
	}

	function startOrder() {
		dispatch('order');
	}

	$: show, updateTotals();
</script>

<UIOverlay on:reject="{overlayClosed}" bind:this={overlay} bind:show={show} {closeOnClick} {closeButton}>
	<div class="cart-list-items-paper">
		<div class="box">
			<h2 class="title is-2">{title}</h2>
			<h3 class="subtitle is-3">Всего товаров: {totalQuantity}, общей стоимостью: <span class="total-price">{@html totalPrice}</span></h3>
			<div class="content">
				<div class="cart-list-items-content">
					{#each content as item}
					<NotCartItem bind:data="{item}" on:quantity.change={onItemQuantityChange} on:item.remove={onItemRemove} />
					{/each}
				</div>
				<div class="buttons is-grouped is-centered mt-4">
					<UIButton action={closeCart} title="Закрыть" color="secondary" classes="cart-form-close" />
					<UIButton action={startOrder} title="Заказать" disabled={isEmpty} raised={true} color="primary" classes="cart-form-order" />
				</div>
			</div>
		</div>
	</div>
</UIOverlay>


<style>
	.cart-list-items-paper {
		display: block;
		height: 85vh;
		width: 85vw;
		margin: 5vh auto auto auto;
	}

	.cart-list-items-content {
		overflow-y: auto;
		height: 70vh;
	}

	@media (max-width:1080px) {
		.cart-list-items-paper {
			display: block;
			overflow-y: scroll;
			height: 100vh;
			width: 100vw;
			margin: 0px;
		}

		.box{
			width: 100%;
			height: 100%;
			margin: 0px;
		}

	}
</style>
