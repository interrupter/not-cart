<script>
	let overlay;

	import NotCartItem from './cart.item.svelte';

	import {
		OverlayComponentStandalone
	} from 'not-overlay';

	import {
		Icon as CommonIcon
	} from '@smui/common';
	import IconButton, {
		Icon
	} from '@smui/icon-button';
	import Button, {
		Label
	} from '@smui/button';
	import Textfield from '@smui/textfield';
	import HelperText from '@smui/textfield/helper-text';
	import Paper, {
		Title,
		Subtitle,
		Content
	} from '@smui/paper';

	import {
		createEventDispatcher
	} from 'svelte';
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

<OverlayComponentStandalone on:reject="{overlayClosed}" bind:this={overlay} bind:show={show} {closeOnClick} {closeButton}>
	<div class="cart-list-items-paper">
		<Paper class="some-selector">
			<Title>{title}</Title>
			<Subtitle>Всего товаров: {totalQuantity}, общей стоимостью: <span class="total-price">{@html totalPrice}</span></Subtitle>
			<Content>
				<div class="cart-list-items-content">
					{#each content as item}
					<NotCartItem bind:data="{item}" on:quantity.change={onItemQuantityChange} on:item.remove={onItemRemove} />
					{/each}
				</div>
				<div class="buttons-row">
					<Button on:click={closeCart} variant="outlined" color="secondary" class="cart-form-close">
						<Label>Закрыть</Label>
					</Button>
					<Button on:click={startOrder} disabled={isEmpty} variant="raised" color="primary" class="cart-form-order pull-right">
						<Label>Заказать</Label>
					</Button>
				</div>
			</Content>
		</Paper>
	</div>
</OverlayComponentStandalone>


<style>	
	.cart-list-items-paper {
		display: block;
		height: 85vh;
		width: 85vw;
		margin: 5vh auto auto auto;
	}

	.cart-list-items-content {
		overflow-y: scroll;
		max-height: 50vh;
	}

	@media (max-width:800px) {
		.cart-list-items-paper {
			display: block;
			overflow-y: scroll;
			height: 100vh;
			width: 100vw;
		}
	}
</style>
