var notCart = (function (exports) {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* node_modules/not-bulma/src/ui.overlay.svelte generated by Svelte v3.35.0 */

    function create_if_block$r(ctx) {
    	let div;
    	let t;
    	let div_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*closeButton*/ ctx[0] && create_if_block_1$j(ctx);
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    			attr(div, "class", "is-overlay not-overlay");
    			set_style(div, "z-index", zIndexStep * /*layer*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append(div, t);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(div, "click", /*overlayClick*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*closeButton*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$j(ctx);
    					if_block.c();
    					if_block.m(div, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*layer*/ 8) {
    				set_style(div, "z-index", zIndexStep * /*layer*/ ctx[3]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && div_transition) div_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (66:1) {#if closeButton}
    function create_if_block_1$j(ctx) {
    	let button;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			attr(button, "class", button_class_value = "delete is-" + /*closeSize*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			if (!mounted) {
    				dispose = listen(button, "click", /*closeButtonClick*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*closeSize*/ 4 && button_class_value !== (button_class_value = "delete is-" + /*closeSize*/ ctx[2])) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$B(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[1] && create_if_block$r(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*show*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*show*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$r(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    const zIndexStep = 1000;

    function instance$B($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let overflowSave = "";
    	const dispatch = createEventDispatcher();
    	let { closeButton = false } = $$props;
    	let { show = true } = $$props;
    	let { closeOnClick = true } = $$props;
    	let { closeSize = "normal" } = $$props;
    	let { layer = 1 } = $$props;

    	function overlayClick(e) {
    		if (closeOnClick) {
    			closeOverlay(e);
    		}
    	}

    	function closeButtonClick() {
    		rejectOverlay();
    	}

    	function closeOverlay(e) {
    		if (e && e.originalTarget && e.originalTarget.classList && e.originalTarget.classList.contains("is-overlay")) {
    			rejectOverlay();
    		}
    	}

    	function rejectOverlay(data = {}) {
    		dispatch("reject", data);
    	}

    	onMount(() => {
    		$$invalidate(7, overflowSave = document.body.style.overflow);
    	});

    	onDestroy(() => {
    		document.body.style.overflow = overflowSave;
    	});

    	$$self.$$set = $$props => {
    		if ("closeButton" in $$props) $$invalidate(0, closeButton = $$props.closeButton);
    		if ("show" in $$props) $$invalidate(1, show = $$props.show);
    		if ("closeOnClick" in $$props) $$invalidate(6, closeOnClick = $$props.closeOnClick);
    		if ("closeSize" in $$props) $$invalidate(2, closeSize = $$props.closeSize);
    		if ("layer" in $$props) $$invalidate(3, layer = $$props.layer);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*show, overflowSave*/ 130) {
    			if (show) {
    				document.body.style.overflow = "hidden";
    			} else {
    				document.body.style.overflow = overflowSave;
    			}
    		}
    	};

    	return [
    		closeButton,
    		show,
    		closeSize,
    		layer,
    		overlayClick,
    		closeButtonClick,
    		closeOnClick,
    		overflowSave,
    		$$scope,
    		slots
    	];
    }

    class Ui_overlay extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$B, create_fragment$B, safe_not_equal, {
    			closeButton: 0,
    			show: 1,
    			closeOnClick: 6,
    			closeSize: 2,
    			layer: 3
    		});
    	}
    }

    /* node_modules/not-bulma/src/ui.progress.svelte generated by Svelte v3.35.0 */

    function create_fragment$A(ctx) {
    	let progress;
    	let t0;
    	let t1;
    	let progress_class_value;

    	return {
    		c() {
    			progress = element("progress");
    			t0 = text(/*value*/ ctx[0]);
    			t1 = text("%");
    			attr(progress, "class", progress_class_value = "\n  progress\n  " + /*classes*/ ctx[4] + "\n  " + (/*color*/ ctx[2] ? `is-${/*color*/ ctx[2]}` : "") + "\n  " + (/*size*/ ctx[3] ? `is-${/*size*/ ctx[3]}` : ""));
    			progress.value = /*value*/ ctx[0];
    			attr(progress, "max", /*max*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, progress, anchor);
    			append(progress, t0);
    			append(progress, t1);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*value*/ 1) set_data(t0, /*value*/ ctx[0]);

    			if (dirty & /*classes, color, size*/ 28 && progress_class_value !== (progress_class_value = "\n  progress\n  " + /*classes*/ ctx[4] + "\n  " + (/*color*/ ctx[2] ? `is-${/*color*/ ctx[2]}` : "") + "\n  " + (/*size*/ ctx[3] ? `is-${/*size*/ ctx[3]}` : ""))) {
    				attr(progress, "class", progress_class_value);
    			}

    			if (dirty & /*value*/ 1) {
    				progress.value = /*value*/ ctx[0];
    			}

    			if (dirty & /*max*/ 2) {
    				attr(progress, "max", /*max*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(progress);
    		}
    	};
    }

    function instance$A($$self, $$props, $$invalidate) {
    	let { value } = $$props;
    	let { max = 100 } = $$props;
    	let { color = "" } = $$props;
    	let { size = "" } = $$props;
    	let { classes = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("max" in $$props) $$invalidate(1, max = $$props.max);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    		if ("size" in $$props) $$invalidate(3, size = $$props.size);
    		if ("classes" in $$props) $$invalidate(4, classes = $$props.classes);
    	};

    	return [value, max, color, size, classes];
    }

    class Ui_progress extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$A, create_fragment$A, safe_not_equal, {
    			value: 0,
    			max: 1,
    			color: 2,
    			size: 3,
    			classes: 4
    		});
    	}
    }

    /*
    https://github.com/TehShrike/is-mergeable-object

    Included for convinience only. All rights belongs to their authors and etc.
    start of my code marked.

    */

    let isMergeableObject = function isMergeableObject(value) {
    	return isNonNullObject(value) && !isSpecial(value);
    };

    function isNonNullObject(value) {
    	return !!value && typeof value === 'object';
    }

    function isSpecial(value) {
    	var stringValue = Object.prototype.toString.call(value);

    	return stringValue === '[object RegExp]' ||
    		stringValue === '[object Date]' ||
    		isReactElement(value);
    }

    // see https://github.com/facebook/react/blob/b5ac963fb791d1298e7f396236383bc955f916c1/src/isomorphic/classic/element/ReactElement.js#L21-L25
    var canUseSymbol = typeof Symbol === 'function' && Symbol.for;
    var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7;

    function isReactElement(value) {
    	return value.$$typeof === REACT_ELEMENT_TYPE;
    }

    /*
    https://github.com/KyleAMathews/deepmerge

    The MIT License (MIT)

    Copyright (c) 2012 Nicholas Fisher

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
    */


    function emptyTarget(val) {
    	return Array.isArray(val) ? [] : {};
    }

    function cloneUnlessOtherwiseSpecified(value, optionsArgument) {
    	var clone = !optionsArgument || optionsArgument.clone !== false;

    	return (clone && isMergeableObject(value)) ?
    		deepmerge(emptyTarget(value), value, optionsArgument) :
    		value;
    }

    function defaultArrayMerge(target, source, optionsArgument) {
    	return target.concat(source).map(function(element) {
    		return cloneUnlessOtherwiseSpecified(element, optionsArgument);
    	});
    }

    function mergeObject(target, source, optionsArgument) {
    	var destination = {};
    	if (isMergeableObject(target)) {
    		Object.keys(target).forEach(function(key) {
    			destination[key] = cloneUnlessOtherwiseSpecified(target[key], optionsArgument);
    		});
    	}
    	Object.keys(source).forEach(function(key) {
    		if (!isMergeableObject(source[key]) || !target[key]) {
    			destination[key] = cloneUnlessOtherwiseSpecified(source[key], optionsArgument);
    		} else {
    			destination[key] = deepmerge(target[key], source[key], optionsArgument);
    		}
    	});
    	return destination;
    }

    function deepmerge(target, source, optionsArgument) {
    	var sourceIsArray = Array.isArray(source);
    	var targetIsArray = Array.isArray(target);
    	var options = optionsArgument || {
    		arrayMerge: defaultArrayMerge
    	};
    	var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;

    	if (!sourceAndTargetTypesMatch) {
    		return cloneUnlessOtherwiseSpecified(source, optionsArgument);
    	} else if (sourceIsArray) {
    		var arrayMerge = options.arrayMerge || defaultArrayMerge;
    		return arrayMerge(target, source, optionsArgument);
    	} else {
    		return mergeObject(target, source, optionsArgument);
    	}
    }

    deepmerge.all = function deepmergeAll(array, optionsArgument) {
    	if (!Array.isArray(array)) {
    		throw new Error('first argument should be an array');
    	}

    	return array.reduce(function(prev, next) {
    		return deepmerge(prev, next, optionsArgument);
    	}, {});
    };


    class notCommon {
    	static MANAGER = null;
    	static LOG = 'console';

    	static deepMerge = deepmerge;

    	static isError(e) {
    		return (e instanceof Error) || (Object.prototype.hasOwnProperty.call(e, 'status') && e.status === 'error');
    	}

    	static TZ_OFFSET = (new Date().getTimezoneOffset() / 60) * -1;
    	static DEV_ENV = 'production';
    	static ENV_TYPE = window.NOT_ENV_TYPE ? window.NOT_ENV_TYPE : this.DEV_ENV;
    	static NOOP = () => {};

    	static mute() {
    		this.ENV_TYPE = 'production';
    	}

    	static pad(n) {
    		return n < 10 ? '0' + n : n;
    	}

    	//Проверка является ли переменная функцией.
    	static isFunc(func) {
    		return typeof(func) === 'function';
    	}

    	//Проверка является ли переменная массивом
    	static isArray(data) {
    		return (typeof data == "object") && (data instanceof Array);
    	}

    	static localIsoDate(date) {
    		date = date || new Date;
    		let localIsoString = date.getFullYear() + '-' +
    			this.pad(date.getMonth() + 1) + '-' +
    			this.pad(date.getDate()) + 'T' +
    			this.pad(date.getHours()) + ':' +
    			this.pad(date.getMinutes()) + ':' +
    			this.pad(date.getSeconds());
    		return localIsoString;
    	}

    	static getToday() {
    		let today = new Date;
    		let date = today.getFullYear() + '-' + this.pad(today.getMonth() + 1) + '-' + this.pad(today.getDate());
    		return date;
    	}

    	static logMsg() {
    		let now = this.localIsoDate();
    		// eslint-disable-next-line no-console
    		window[this.LOG].log(`[${now}]: `, ...arguments);
    	}

    	static log(){
    		this.logMsg(...arguments);
    	}

    	//Генерация метода вывода сообщений в консоль с указанием префикса.
    	static genLogMsg(prefix) {
    		return function(){
    			let now = notCommon.localIsoDate();
    			// eslint-disable-next-line no-console
    			window[notCommon.LOG].log(`[${now}]: ${prefix}::`, ...arguments);
    		};
    	}

    	/**
    	 * Определяет является ли окружение окружением разработки
    	 * @returns  {boolean} true если это запущено в окружении разработки
    	 **/
    	static isDev() {
    		return this.ENV_TYPE === this.DEV_ENV;
    	}

    	static debug(){
    		if (this.isDev()) {
    			return this.logMsg(...arguments);
    		} else {
    			return this.NOOP;
    		}
    	}

    	static genLogDebug(prefix) {
    		if (this.isDev()) {
    			return this.genLogMsg(prefix);
    		} else {
    			return this.NOOP;
    		}
    	}

    	static error(){
    		this.logError(...arguments);
    	}

    	//Функция вывода сообщения об ошибке
    	static logError() {
    		let now = this.localIsoDate();
    		// eslint-disable-next-line no-console
    		window[this.LOG].error(`[${now}]: `, ...arguments);
    	}

    	static genLogError(prefix) {
    		return function(){
    			let now = notCommon.localIsoDate();
    			// eslint-disable-next-line no-console
    			window[notCommon.LOG].error(`[${now}]: ${prefix}::`, ...arguments);
    		};
    	}

    	static report(e) {
    		if (this.getApp() && this.getApp().getOptions('services.notErrorReporter')) {
    			let reporter = this.getApp().getOptions('services.notErrorReporter');
    			if (reporter && reporter.report) {
    				reporter.report(e).catch(this.error.bind(this));
    			}
    		} else {
    			if (!this.get('production')) {
    				this.error(...arguments);
    			}
    		}
    	}

    	static trace() {
    		if (!this.get('production')) {
    			this.trace(...arguments);
    		}
    	}

    	static trimBackslash(str){
    		if(str.indexOf('/') === 0){
    			str = str.substring(1);
    		}
    		if(str[str.length - 1] === '/'){
    			str = str.substring(0, str.length - 1);
    		}
    		return str;
    	}

    	/**
    	*	Builds URL with structure like prefix/module/model/id/action
    	* If some part absent or set to false it will be excluded from result
    	*
    	*	@return {string}	url path
    	*/
    	static buildURL({	prefix, module, model, id, action	}){
    		let url = ['/'];
    		if(prefix)	{	url.push(encodeURIComponent(this.trimBackslash(prefix)));}
    		if(module)	{ url.push(encodeURIComponent(this.trimBackslash(module)));}
    		if(model)		{ url.push(encodeURIComponent(this.trimBackslash(model)));}
    		if(id)			{ url.push(encodeURIComponent(this.trimBackslash(id)));			}
    		if(action)	{ url.push(encodeURIComponent(this.trimBackslash(action)));	}
    		url = url.filter(el => el !== '' );
    		return url.join('/').replace(/\/\//g, '/');
    	}


    	static capitalizeFirstLetter(name) {
    		return name.charAt(0).toUpperCase() + name.slice(1);
    	}

    	static lowerFirstLetter(string) {
    		return string.charAt(0).toLowerCase() + string.slice(1);
    	}

    	static escapeHtml(unsafe) {
    		return unsafe
    			.replace(/&/g, '&amp;')
    			.replace(/</g, '&lt;')
    			.replace(/>/g, '&gt;')
    			.replace(/"/g, '&quot;')
    			.replace(/'/g, '&#039;');
    	}

    	static startApp(starter) {
    		document.addEventListener('DOMContentLoaded', starter);
    	}

    	static getApp() {
    		return this.get('app');
    	}

    	static extendAppConfig(conf, conf2) {
    		return this.deepMerge(conf, conf2);
    	}

    	static absorbModule(defaultConf, mod, services = {}, uis = {}) {
    		for (let prop in mod) {
    			//add manifest to other
    			switch (prop) {
    				case 'manifest':
    					defaultConf = this.extendAppConfig(defaultConf, mod.manifest);
    					break;
    				case 'services':
    					if (services){
    						for(let serv in mod[prop]){
    							services[serv] = mod[prop][serv];
    						}
    					}
    					break;
    				case 'uis':
    					if (uis){
    						for(let ui in mod[prop]){
    							if(Object.prototype.hasOwnProperty.call(uis, ui)){
    								this.logError(`uis property duplication ${ui}`);
    							}
    							uis[ui] = mod[prop][ui];
    						}
    					}
    					break;
    				default:
    					if(prop.indexOf('nc')===0){
    						if(!Object.prototype.hasOwnProperty.call(defaultConf, 'controllers')){
    							defaultConf.controllers = {};
    						}
    						defaultConf.controllers[prop] = mod[prop];
    					}else {
    					//in case of some other stuff presented, isolating it in special var
    						if(!Object.prototype.hasOwnProperty.call(window, 'notEnv')){
    							window.notEnv = {};
    						}
    						window.notEnv[prop] = mod[prop];
    					}
    			}
    		}
    		return defaultConf;
    	}

    	static defineIfNotExists(obj, key, defaultValue) {
    		if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    			obj[key] = defaultValue;
    		}
    	}

    	static registry = {};

    	static register(key, val) {
    		this.registry[key] = val;
    	}

    	static get(key) {
    		return Object.prototype.hasOwnProperty.call(this.registry, key) ? this.registry[key] : null;
    	}

    	static moveItem(array, old_index, new_index) {
    		if (new_index >= array.length) {
    			var k = new_index - array.length;
    			while ((k--) + 1) {
    				array.push(undefined);
    			}
    		}
    		array.splice(new_index, 0, array.splice(old_index, 1)[0]);
    	}

    	static stripProxy(obj) {
    		if (typeof obj !== 'undefined' && obj !== null) {
    			if (obj.isProxy) {
    				if (Array.isArray(obj)) {
    					obj = Array.from(obj);
    				} else {
    					obj = Object.assign({}, obj);
    				}
    				for (let t in obj) {
    					if (Object.prototype.hasOwnProperty.call(obj, t)) {
    						obj[t] = this.stripProxy(obj[t]);
    					}
    				}
    			}
    		}
    		return obj;
    	}

    	static pipe(data /* feed data */ , funcs /* functions array */ ) {
    		let result;
    		for (let func of funcs) {
    			result = func(result || data);
    		}
    		return result;
    	}

    	static getAPI(type) {
    		return this.getManager() ? this.getManager().getAPI(type) : null;
    	}

    	static setManager(v) {
    		this.MANAGER = v;
    	}

    	static getManager() {
    		return this.MANAGER;
    	}

    	static getJSON(url){
    		return fetch(url).then(response => response.json());
    	}

    	static wait(sec){
    		return new Promise((res)=>{
    			setTimeout(res, sec * 1000);
    		});
    	}

    	static registerWidgetEvents(events){
    		if(this.getApp()){
    			Object.keys(events).forEach(eventName => {
    				this.getApp().on(eventName, events[eventName]);
    			});
    		}
    	}

    }

    /*
    	:property.sub1.func().funcProp
    	 = return funcProp of function result of sub1 property of property of object
    	:{::helperVal}.sub
    	 = return sub property of object property with name retrieved from helperVal property of helpers object
    	:{::helperFunc()}.sub
    	= return sub property of object property with name retrieved from helperVal function result of helpers object.
    	if helpersFunx return 'car' then source path becomes :car.sub

    */

    const SUB_PATH_START = '{',
    	SUB_PATH_END = '}',
    	PATH_SPLIT = '.',
    	PATH_START_OBJECT = ':',
    	PATH_START_HELPERS = '::',
    	FUNCTION_MARKER = '()',
    	MAX_DEEP = 10;

    /**
     * Set of tools to use notPath property access notation
     * : is for item
     * :: is for helpers
     * {} subpath
     * . path splitter
     * () function and should be executed with params (item, helper | undefined)
     * sub-paths will be parsed and replaced by results in source path
     */
    class notPath$1 {
    	constructor() {
    		return this;
    	}
    	/*
    		input ':{::helperVal}.sub'
    		return ::helperVal
    	*/

    	/**
    	 * Returns first subpath in path
    	 * if subpath not closed will return it anyway
    	 * @param {string} path path in string notation
    	 * @return {string|null} subpath or null if no sub path were found
    	 */
    	findNextSubPath(path) {
    		let subPath = '',
    			find = false;
    		for (let i = 0; i < path.length; i++) {
    			if (path[i] === SUB_PATH_START) {
    				find = true;
    				subPath = '';
    			} else {
    				if ((path[i] === SUB_PATH_END) && find) {
    					return subPath;
    				} else {
    					subPath += path[i];
    				}
    			}
    		}
    		return find ? subPath : null;
    	}

    	/**
    	 * Replace sub-path in parent path by parsed version
    	 * @param {string} path path to process
    	 * @param {string} sub sub path to replace
    	 * @param {string} parsed parsed sub path
    	 * @return {string} parsed path
    	 */

    	replaceSubPath(path, sub, parsed) {
    		let subf = SUB_PATH_START + sub + SUB_PATH_END,
    			i = 0;
    		while ((path.indexOf(subf) > -1) && i < MAX_DEEP) {
    			path = path.replace(subf, parsed);
    			i++;
    		}
    		return path;
    	}

    	/**
    	 * Parses path while there any sub-paths
    	 * @param {string} path raw unparsed path
    	 * @param {object} item data
    	 * @param {object} helpers helpers
    	 * @return {string} parsed path
    	 */
    	parseSubs(path, item, helpers) {
    		let subPath = this.findNextSubPath(path),
    			subPathParsed, i = 0;
    		while (subPath) {
    			subPathParsed = this.getValueByPath(subPath.indexOf(PATH_START_HELPERS) > -1 ? helpers : item, subPath, item, helpers);
    			path = this.replaceSubPath(path, subPath, subPathParsed);
    			i++;
    			if (i > MAX_DEEP) {
    				break;
    			}
    			subPath = this.findNextSubPath(path);
    		}
    		return path;
    	}

    	/**
    	 * Get property value
    	 * @param {string} path path to property
    	 * @param {object} item item object
    	 * @param {object} helpers helpers object
    	 */

    	get(path, item, helpers) {
    		switch (path) {
    		case PATH_START_OBJECT:
    			return item;
    		case PATH_START_HELPERS:
    			return helpers;
    		}
    		path = this.parseSubs(path, item, helpers);
    		return this.getValueByPath(path.indexOf(PATH_START_HELPERS) > -1 ? helpers : item, path, item, helpers);
    	}

    	/**
    	 * Set property value
    	 * @param {string} path path to property
    	 * @param {object} item item object
    	 * @param {object} helpers helpers object
    	 * @param {any} attrValue value we want to assign
    	 */

    	set(path, item, helpers, attrValue) {
    		if (arguments.length === 3) {
    			attrValue = helpers;
    			helpers = undefined;
    		}
    		let subPath = this.findNextSubPath(path),
    			subPathParsed,
    			i = 0;
    		while (subPath) {

    			subPathParsed = this.getValueByPath(subPath.indexOf(PATH_START_HELPERS) > -1 ? helpers : item, subPath, item, helpers);

    			path = this.replaceSubPath(path, subPath, subPathParsed);

    			if (i > MAX_DEEP) {
    				break;
    			}
    			subPath = this.findNextSubPath(path);
    			i++;
    		}

    		this.setValueByPath(item, path, attrValue);

    		if (item.isRecord && this.normilizePath(path).length > 1 && item.__isActive) {
    			item.trigger('change', item, path, attrValue);
    		}
    	}

    	/**
    	 * Set target property to null
    	 * @param {string} path path to property
    	 * @param {object} item item object
    	 * @param {object} helpers helpers object
    	 */

    	unset(path, item, helpers) {
    		this.set(path, item, helpers, null);
    	}

    	/**
    	 * Parses step key, transforms it to end-form
    	 * @param {string} step not parsed step key
    	 * @param {object} item item object
    	 * @param {object} helper helpers object
    	 * @return {string|number} parsed step key
    	 */

    	parsePathStep(step, item, helper) {
    		let rStep = null;
    		if (step.indexOf(PATH_START_HELPERS) === 0 && helper) {
    			rStep = step.replace(PATH_START_HELPERS, '');
    			if (rStep.indexOf(FUNCTION_MARKER) === rStep.length - 2) {
    				rStep = rStep.replace(FUNCTION_MARKER, '');
    				if (helper.hasOwnProperty(rStep)) {
    					return helper[rStep](item, undefined);
    				}
    			} else {
    				return helper[rStep];
    			}
    		} else {
    			if (step.indexOf(PATH_START_OBJECT) === 0 && item) {
    				rStep = step.replace(PATH_START_OBJECT, '');
    				if (rStep.indexOf(FUNCTION_MARKER) === rStep.length - 2) {
    					rStep = rStep.replace(FUNCTION_MARKER, '');
    					if (item.hasOwnProperty(rStep)) {
    						return item[rStep](item, undefined);
    					}
    				} else {
    					return item[rStep];
    				}
    			}
    		}
    		return step;
    	}

    	//::fieldName.result
    	//{}
    	//{fieldName: 'targetRecordField'}
    	////['targetRecordField', 'result']
    	/**
    	 * Transforms path with sub paths to path without
    	 * @param {string|array} path path to target property
    	 * @param {object} item item object
    	 * @param {object} helper helper object
    	 * @return {array} parsed path
    	 **/
    	parsePath(path, item, helper) {
    		if (!Array.isArray(path)) {
    			path = path.split(PATH_SPLIT);
    		}
    		for (var i = 0; i < path.length; i++) {
    			path[i] = this.parsePathStep(path[i], item, helper);
    		}
    		return path;
    	}

    	/**
    	 * Transforms path from string notation to array of keys
    	 * @param {string|array} path  input path, if array does nothing
    	 * @return {array} path in array notation
    	 */

    	normilizePath(path) {
    		if (Array.isArray(path)) {
    			return path;
    		} else {
    			while (path.indexOf(PATH_START_OBJECT) > -1) {
    				path = path.replace(PATH_START_OBJECT, '');
    			}
    			return path.split(PATH_SPLIT);
    		}
    	}

    	/*
    		small = ["todo"],
    		big = ["todo", "length"]
    		return true;

    	*/

    	/**
    	 * Identifies if first path includes second, compared from start,
    	 * no floating start position inside ['join', 'me'], ['me']
    	 * will result in false
    	 * @param {array} big where we will search
    	 * @param {array} small what we will search
    	 * @return {boolean} if we succeed
    	 */

    	ifFullSubPath(big, small) {
    		if (big.length < small.length) {
    			return false;
    		}
    		for (let t = 0; t < small.length; t++) {
    			if (small[t] !== big[t]) {
    				return false;
    			}
    		}
    		return true;
    	}

    	/**
    	 * Getter through third object
    	 * Path is parsed, no event triggering for notRecord
    	 * @param {object} object object to be used as getter
    	 * @param {string|array} attrPath path to property
    	 * @param {object} item supporting data
    	 * @param {helpers} object  supporting helpers
    	 */

    	getValueByPath(object, attrPath, item, helpers) {
    		attrPath = this.normilizePath(attrPath);
    		let attrName = attrPath.shift(),
    			isFunction = attrName.indexOf(FUNCTION_MARKER) > -1;
    		if (isFunction) {
    			attrName = attrName.replace(FUNCTION_MARKER, '');
    		}
    		if ((typeof object === 'object' && typeof object !== 'undefined' && object!== null) && typeof object[attrName] !== 'undefined' && object[attrName] !== null) {
    			let newObj = isFunction ? object[attrName]({
    				item,
    				helpers
    			}) : object[attrName];
    			if (attrPath.length > 0) {
    				return this.getValueByPath(newObj, attrPath, item, helpers);
    			} else {
    				return newObj;
    			}
    		} else {
    			return undefined;
    		}
    	}

    	/**
    	 * Setter through third object
    	 * Path is parsed, no event triggering for notRecord
    	 * @param {object} object object to be modified
    	 * @param {string|array} attrPath path to property
    	 * @param {any} attrValue  value to assign
    	 */

    	setValueByPath(object, attrPath, attrValue) {
    		attrPath = this.normilizePath(attrPath);
    		let attrName = attrPath.shift();
    		if (attrPath.length > 0) {
    			if (!object.hasOwnProperty(attrName)) {
    				object[attrName] = {};
    			}
    			this.setValueByPath(object[attrName], attrPath, attrValue);
    		} else {
    			object[attrName] = attrValue;
    		}
    	}

    	/**
    	* Joins passed in strings with PATH_SPLIT
    	* @param {string} arguments path to be glued
    	* @return {string} composite path
    	*/

    	join() {
    		let args = Array.prototype.slice.call(arguments);
    		return args.join(PATH_SPLIT);
    	}
    }

    var src = new notPath$1();

    var notPath = src;

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var EventEmitter = createCommonjsModule(function (module) {
    (function (exports) {

        /**
         * Class for managing events.
         * Can be extended to provide event functionality in other classes.
         *
         * @class EventEmitter Manages event registering and emitting.
         */
        function EventEmitter() {}

        // Shortcuts to improve speed and size
        var proto = EventEmitter.prototype;
        var originalGlobalValue = exports.EventEmitter;

        /**
         * Finds the index of the listener for the event in its storage array.
         *
         * @param {Function[]} listeners Array of listeners to search through.
         * @param {Function} listener Method to look for.
         * @return {Number} Index of the specified listener, -1 if not found
         * @api private
         */
        function indexOfListener(listeners, listener) {
            var i = listeners.length;
            while (i--) {
                if (listeners[i].listener === listener) {
                    return i;
                }
            }

            return -1;
        }

        /**
         * Alias a method while keeping the context correct, to allow for overwriting of target method.
         *
         * @param {String} name The name of the target method.
         * @return {Function} The aliased method
         * @api private
         */
        function alias(name) {
            return function aliasClosure() {
                return this[name].apply(this, arguments);
            };
        }

        /**
         * Returns the listener array for the specified event.
         * Will initialise the event object and listener arrays if required.
         * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
         * Each property in the object response is an array of listener functions.
         *
         * @param {String|RegExp} evt Name of the event to return the listeners from.
         * @return {Function[]|Object} All listener functions for the event.
         */
        proto.getListeners = function getListeners(evt) {
            var events = this._getEvents();
            var response;
            var key;

            // Return a concatenated array of all matching events if
            // the selector is a regular expression.
            if (evt instanceof RegExp) {
                response = {};
                for (key in events) {
                    if (events.hasOwnProperty(key) && evt.test(key)) {
                        response[key] = events[key];
                    }
                }
            }
            else {
                response = events[evt] || (events[evt] = []);
            }

            return response;
        };

        /**
         * Takes a list of listener objects and flattens it into a list of listener functions.
         *
         * @param {Object[]} listeners Raw listener objects.
         * @return {Function[]} Just the listener functions.
         */
        proto.flattenListeners = function flattenListeners(listeners) {
            var flatListeners = [];
            var i;

            for (i = 0; i < listeners.length; i += 1) {
                flatListeners.push(listeners[i].listener);
            }

            return flatListeners;
        };

        /**
         * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
         *
         * @param {String|RegExp} evt Name of the event to return the listeners from.
         * @return {Object} All listener functions for an event in an object.
         */
        proto.getListenersAsObject = function getListenersAsObject(evt) {
            var listeners = this.getListeners(evt);
            var response;

            if (listeners instanceof Array) {
                response = {};
                response[evt] = listeners;
            }

            return response || listeners;
        };

        function isValidListener (listener) {
            if (typeof listener === 'function' || listener instanceof RegExp) {
                return true
            } else if (listener && typeof listener === 'object') {
                return isValidListener(listener.listener)
            } else {
                return false
            }
        }

        /**
         * Adds a listener function to the specified event.
         * The listener will not be added if it is a duplicate.
         * If the listener returns true then it will be removed after it is called.
         * If you pass a regular expression as the event name then the listener will be added to all events that match it.
         *
         * @param {String|RegExp} evt Name of the event to attach the listener to.
         * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.addListener = function addListener(evt, listener) {
            if (!isValidListener(listener)) {
                throw new TypeError('listener must be a function');
            }

            var listeners = this.getListenersAsObject(evt);
            var listenerIsWrapped = typeof listener === 'object';
            var key;

            for (key in listeners) {
                if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                    listeners[key].push(listenerIsWrapped ? listener : {
                        listener: listener,
                        once: false
                    });
                }
            }

            return this;
        };

        /**
         * Alias of addListener
         */
        proto.on = alias('addListener');

        /**
         * Semi-alias of addListener. It will add a listener that will be
         * automatically removed after its first execution.
         *
         * @param {String|RegExp} evt Name of the event to attach the listener to.
         * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.addOnceListener = function addOnceListener(evt, listener) {
            return this.addListener(evt, {
                listener: listener,
                once: true
            });
        };

        /**
         * Alias of addOnceListener.
         */
        proto.once = alias('addOnceListener');

        /**
         * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
         * You need to tell it what event names should be matched by a regex.
         *
         * @param {String} evt Name of the event to create.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.defineEvent = function defineEvent(evt) {
            this.getListeners(evt);
            return this;
        };

        /**
         * Uses defineEvent to define multiple events.
         *
         * @param {String[]} evts An array of event names to define.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.defineEvents = function defineEvents(evts) {
            for (var i = 0; i < evts.length; i += 1) {
                this.defineEvent(evts[i]);
            }
            return this;
        };

        /**
         * Removes a listener function from the specified event.
         * When passed a regular expression as the event name, it will remove the listener from all events that match it.
         *
         * @param {String|RegExp} evt Name of the event to remove the listener from.
         * @param {Function} listener Method to remove from the event.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.removeListener = function removeListener(evt, listener) {
            var listeners = this.getListenersAsObject(evt);
            var index;
            var key;

            for (key in listeners) {
                if (listeners.hasOwnProperty(key)) {
                    index = indexOfListener(listeners[key], listener);

                    if (index !== -1) {
                        listeners[key].splice(index, 1);
                    }
                }
            }

            return this;
        };

        /**
         * Alias of removeListener
         */
        proto.off = alias('removeListener');

        /**
         * Adds listeners in bulk using the manipulateListeners method.
         * If you pass an object as the first argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
         * You can also pass it a regular expression to add the array of listeners to all events that match it.
         * Yeah, this function does quite a bit. That's probably a bad thing.
         *
         * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
         * @param {Function[]} [listeners] An optional array of listener functions to add.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.addListeners = function addListeners(evt, listeners) {
            // Pass through to manipulateListeners
            return this.manipulateListeners(false, evt, listeners);
        };

        /**
         * Removes listeners in bulk using the manipulateListeners method.
         * If you pass an object as the first argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
         * You can also pass it an event name and an array of listeners to be removed.
         * You can also pass it a regular expression to remove the listeners from all events that match it.
         *
         * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
         * @param {Function[]} [listeners] An optional array of listener functions to remove.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.removeListeners = function removeListeners(evt, listeners) {
            // Pass through to manipulateListeners
            return this.manipulateListeners(true, evt, listeners);
        };

        /**
         * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
         * The first argument will determine if the listeners are removed (true) or added (false).
         * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
         * You can also pass it an event name and an array of listeners to be added/removed.
         * You can also pass it a regular expression to manipulate the listeners of all events that match it.
         *
         * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
         * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
         * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
            var i;
            var value;
            var single = remove ? this.removeListener : this.addListener;
            var multiple = remove ? this.removeListeners : this.addListeners;

            // If evt is an object then pass each of its properties to this method
            if (typeof evt === 'object' && !(evt instanceof RegExp)) {
                for (i in evt) {
                    if (evt.hasOwnProperty(i) && (value = evt[i])) {
                        // Pass the single listener straight through to the singular method
                        if (typeof value === 'function') {
                            single.call(this, i, value);
                        }
                        else {
                            // Otherwise pass back to the multiple function
                            multiple.call(this, i, value);
                        }
                    }
                }
            }
            else {
                // So evt must be a string
                // And listeners must be an array of listeners
                // Loop over it and pass each one to the multiple method
                i = listeners.length;
                while (i--) {
                    single.call(this, evt, listeners[i]);
                }
            }

            return this;
        };

        /**
         * Removes all listeners from a specified event.
         * If you do not specify an event then all listeners will be removed.
         * That means every event will be emptied.
         * You can also pass a regex to remove all events that match it.
         *
         * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.removeEvent = function removeEvent(evt) {
            var type = typeof evt;
            var events = this._getEvents();
            var key;

            // Remove different things depending on the state of evt
            if (type === 'string') {
                // Remove all listeners for the specified event
                delete events[evt];
            }
            else if (evt instanceof RegExp) {
                // Remove all events matching the regex.
                for (key in events) {
                    if (events.hasOwnProperty(key) && evt.test(key)) {
                        delete events[key];
                    }
                }
            }
            else {
                // Remove all listeners in all events
                delete this._events;
            }

            return this;
        };

        /**
         * Alias of removeEvent.
         *
         * Added to mirror the node API.
         */
        proto.removeAllListeners = alias('removeEvent');

        /**
         * Emits an event of your choice.
         * When emitted, every listener attached to that event will be executed.
         * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
         * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
         * So they will not arrive within the array on the other side, they will be separate.
         * You can also pass a regular expression to emit to all events that match it.
         *
         * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
         * @param {Array} [args] Optional array of arguments to be passed to each listener.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.emitEvent = function emitEvent(evt, args) {
            var listenersMap = this.getListenersAsObject(evt);
            var listeners;
            var listener;
            var i;
            var key;
            var response;

            for (key in listenersMap) {
                if (listenersMap.hasOwnProperty(key)) {
                    listeners = listenersMap[key].slice(0);

                    for (i = 0; i < listeners.length; i++) {
                        // If the listener returns true then it shall be removed from the event
                        // The function is executed either with a basic call or an apply if there is an args array
                        listener = listeners[i];

                        if (listener.once === true) {
                            this.removeListener(evt, listener.listener);
                        }

                        response = listener.listener.apply(this, args || []);

                        if (response === this._getOnceReturnValue()) {
                            this.removeListener(evt, listener.listener);
                        }
                    }
                }
            }

            return this;
        };

        /**
         * Alias of emitEvent
         */
        proto.trigger = alias('emitEvent');

        /**
         * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
         * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
         *
         * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
         * @param {...*} Optional additional arguments to be passed to each listener.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.emit = function emit(evt) {
            var args = Array.prototype.slice.call(arguments, 1);
            return this.emitEvent(evt, args);
        };

        /**
         * Sets the current value to check against when executing listeners. If a
         * listeners return value matches the one set here then it will be removed
         * after execution. This value defaults to true.
         *
         * @param {*} value The new value to check for when executing listeners.
         * @return {Object} Current instance of EventEmitter for chaining.
         */
        proto.setOnceReturnValue = function setOnceReturnValue(value) {
            this._onceReturnValue = value;
            return this;
        };

        /**
         * Fetches the current value to check against when executing listeners. If
         * the listeners return value matches this one then it should be removed
         * automatically. It will return true by default.
         *
         * @return {*|Boolean} The current value to check for or the default, true.
         * @api private
         */
        proto._getOnceReturnValue = function _getOnceReturnValue() {
            if (this.hasOwnProperty('_onceReturnValue')) {
                return this._onceReturnValue;
            }
            else {
                return true;
            }
        };

        /**
         * Fetches the events object and creates one if required.
         *
         * @return {Object} The events storage object.
         * @api private
         */
        proto._getEvents = function _getEvents() {
            return this._events || (this._events = {});
        };

        /**
         * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
         *
         * @return {Function} Non conflicting EventEmitter class.
         */
        EventEmitter.noConflict = function noConflict() {
            exports.EventEmitter = originalGlobalValue;
            return EventEmitter;
        };

        // Expose the class either via AMD, CommonJS or the global object
        if (module.exports){
            module.exports = EventEmitter;
        }
        else {
            exports.EventEmitter = EventEmitter;
        }
    }(typeof window !== 'undefined' ? window : commonjsGlobal || {}));
    });

    const META_METHOD_INIT = Symbol('init'),
    	META_DATA = Symbol('data'),
    	META_WORKING = Symbol('working'),
    	META_OPTIONS = Symbol('options');

    class notBase extends EventEmitter {
    	constructor(input) {
    		super();
    		this[META_DATA] = {};
    		this[META_WORKING] = {};
    		this[META_OPTIONS] = {};
    		this[META_METHOD_INIT](input);
    		return this;
    	}

    	[META_METHOD_INIT](input) {
    		if (!input) {
    			input = {};
    		}

    		if (Object.prototype.hasOwnProperty.call(input, 'data')) {
    			this.setData(input.data);
    		}

    		if (Object.prototype.hasOwnProperty.call(input, 'working')) {
    			this.setWorking(input.working);
    		}

    		if (Object.prototype.hasOwnProperty.call(input,'options')) {
    			this.setOptions(input.options);
    		}

    		this.log = notCommon.genLogMsg(this.getWorking('name'));
    		this.info = this.log;
    		this.debug = notCommon.genLogDebug(this.getWorking('name'));
    		this.error = notCommon.genLogError(this.getWorking('name'));
    	}

    	setCommon(what, args) {
    		switch (args.length) {
    		case 1:
    		{
    			/* set collection */
    			what = args[0];
    			break;
    		}
    		case 2:
    		{
    			/* set collection element */
    			notPath.set(args[0] /* path */ , what /* collection */ , undefined /* helpers */ , args[1] /* value */ );
    			break;
    		}
    		}
    		return this;
    	}
    	getCommon(what, args) {
    		switch (args.length) {
    		/* if we want get data by path */
    		case 1:
    		{
    			return notPath.get(args[0], what);
    		}
    		/* if we want get data by path with default value */
    		case 2:
    		{
    			let res = notPath.get(args[0], what);
    			if (res === undefined) {
    				/* no data, return default value */
    				return args[1];
    			} else {
    				/* data, return it */
    				return res;
    			}
    		}
    		/* return full collection */
    		default:
    		{
    			return what;
    		}
    		}
    	}

    	/*
    		CORE OBJECT
    			DATA - information
    			OPTIONS - how to work
    			WORKING - temporarily generated in proccess
    	*/

    	setData() {
    		if (arguments.length === 1) {
    			this[META_DATA] = arguments[0];
    		} else {
    			this.setCommon(this.getData(), arguments);
    		}
    		this.emit('change');
    		return this;
    	}

    	getData() {
    		return this.getCommon(this[META_DATA], arguments);
    	}

    	setOptions() {
    		if (arguments.length === 1) {
    			this[META_OPTIONS] = arguments[0];
    		} else {
    			this.setCommon(this.getOptions(), arguments);
    		}
    		return this;
    	}

    	getOptions() {
    		return this.getCommon(this[META_OPTIONS], arguments);
    	}

    	setWorking() {
    		if (arguments.length === 1) {
    			this[META_WORKING] = arguments[0];
    		} else {
    			this.setCommon(this.getWorking(), arguments);
    		}
    		return this;
    	}

    	getWorking() {
    		return this.getCommon(this[META_WORKING], arguments);
    	}

    	report(e) {
    		if (notCommon.report) {
    			notCommon.report(e);
    		}
    	}

    	getApp(){
    		return notCommon.getApp();
    	}

    }

    const OPT_MODE_HISTORY = Symbol('history'),
    	OPT_MODE_HASH = Symbol('hash'),
    	OPT_DEFAULT_CHECK_INTERVAL = 50;

    class notRouter extends notBase {
    	constructor() {
    		super({
    			working:{
    				routes: [],
    				mode: OPT_MODE_HISTORY,
    				root: '/', //always in slashes /user/, /, /input/. and no /user or input/level
    				initialized: false
    			}
    		});
    		return this;
    	}

    	history() {
    		this.setWorking('mode', OPT_MODE_HISTORY);
    	}

    	hash() {
    		this.setWorking('mode', OPT_MODE_HASH);
    	}


    	// root should start and end with /
    	setRoot(root) {
    		this.setWorking('root', (root && root !== '/') ? '/' + this.clearSlashes(root) + '/' : '/');
    		return this;
    	}

    	clearSlashes(path) {
    		//first and last slashes removal
    		return path.toString().replace(/\/$/, '').replace(/^\//, '');
    	}

    	add(re, handler) {
    		if (typeof re == 'function') {
    			handler = re;
    			re = '';
    		}
    		let rule = {
    			re: re,
    			handler: handler
    		};
    		this.getWorking('routes').push(rule);
    		return this;
    	}

    	addList(list) {
    		for (let t in list) {
    			this.add(t, list[t]);
    		}
    		return this;
    	}

    	remove(param) {
    		for (var i = 0, r; i < this.getWorking('routes').length, r = this.getWorking('routes')[i]; i++) {
    			if (r.handler === param || r.re === param) {
    				this.getWorking('routes').splice(i, 1);
    				return this;
    			}
    		}
    		return this;
    	}

    	flush() {
    		this.setWorking({
    			routes: [],
    			mode: OPT_MODE_HISTORY,
    			root: '/'
    		});
    		return this;
    	}

    	isInitialized() {
    		return this.getWorking('initialized');
    	}

    	setInitialized(val = true) {
    		return this.setWorking('initialized', val);
    	}

    	getFragment() {
    		var fragment = '';
    		if (this.getWorking('mode') === OPT_MODE_HISTORY) {
    			if (!location) return '';
    			fragment = this.clearSlashes(decodeURI(location.pathname + location.search));
    			fragment = fragment.replace(/\?(.*)$/, '');
    			fragment = this.getWorking('root') != '/' ? fragment.replace(this.getWorking('root'), '') : fragment;
    		} else {
    			if (!window) return '';
    			var match = window.location.href.match(/#(.*)$/);
    			fragment = match ? match[1] : '';
    		}
    		return this.clearSlashes(fragment);
    	}

    	checkLocation() {
    		let current = this.getWorking('current'),
    			fragment = this.getFragment(),
    			init = this.isInitialized();
    		if ((current !== fragment) || !init) {
    			this.setWorking('current', fragment);
    			this.check(fragment);
    			this.setInitialized(true);
    		}
    	}

    	hrefClick() {
    		//console.log(...arguments);
    	}

    	getRoot() {
    		return this.getWorking('root');
    	}

    	listen(loopInterval = OPT_DEFAULT_CHECK_INTERVAL) {
    		this.setWorking('current', 'notInitialized');
    		clearInterval(this.getWorking('interval'));
    		this.setWorking('interval', setInterval(this.checkLocation.bind(this), loopInterval));
    		window.addEventListener('popstate', this.hrefClick.bind(this));
    		return this;
    	}

    	check(f) {
    		let fragment = (f || this.getFragment()),
    			failBack = null;
    		for (let i = 0; i < this.getWorking('routes').length; i++) {
    			let path = this.getWorking('root') + this.getWorking('routes')[i].re,
    				fullRE = this.clearSlashes(decodeURI(path)),
    				match = fragment.match(fullRE);
    			if (match && match.length) {
    				if (fullRE === ''){
    					match.shift();
    					failBack = {
    						route: this.getWorking('routes')[i],
    						match
    					};
    				}else {
    					match.shift();
    					this.getWorking('routes')[i].handler.apply(this.host || {}, match);
    					this.emit('afterRoute',this.getWorking('routes')[i]);
    					return this;
    				}
    			}
    		}
    		if (failBack){
    			failBack.route.handler.apply(this.host || {}, failBack.match);
    			this.emit('afterRoute', failBack.route);
    		}
    		return this;
    	}

    	/**
    	*	Refreshes page
    	* @param {integer} timeout time to wait in ms
    	*/
    	refresh(timeout = 0){
    		if(timeout > 0){
    			setTimeout(()=>this.refresh(), timeout);
    		}else {
    			this.check(this.getWorking('current'));
    		}
    	}

    	navigate(path) {
    		path = path ? path : '';
    		switch (this.getWorking('mode')) {
    		case OPT_MODE_HISTORY:
    		{
    			//console.log('push state', this.getFullRoute(path));
    			this.lastRoute = this.getFullRoute(path);
    			history.pushState(null, null, this.lastRoute);
    			break;
    		}
    		case OPT_MODE_HASH:
    		{
    			window.location.href.match(/#(.*)$/);
    			window.location.href = window.location.href.replace(/#(.*)$/, '') + '#' + path;
    			break;
    		}
    		}
    		return this;
    	}

    	getFullRoute(path = '') {
    		path = this.clearSlashes(path);
    		let root = this.getWorking('root');
    		if (root !== '/'){
    			if(path.indexOf(root.substring(1)) === 0){
    				return '/' + path;
    			}
    		}
    		return this.getWorking('root') + this.clearSlashes(path);
    	}

    	getAllLinks() {
    		var allElements = document.body.querySelectorAll('a');
    		var list = [];
    		for (var j = 0; j < allElements.length; j++) {
    			for (var i = 0, atts = allElements[j].attributes, n = atts.length; i < n; i++) {
    				if (atts[i].nodeName.indexOf('n-href') === 0) {
    					list.push(allElements[j]);
    					break;
    				}
    			}
    		}
    		return list;
    	}

    	reRouteExisted() {
    		let list = this.getAllLinks();
    		for (let t = 0; t < list.length; t++) {
    			this.initRerouting(list[t], list[t].getAttribute('n-href'));
    		}
    		return this;
    	}

    	initRerouting(el, link) {
    		if (!el.notRouterInitialized) {
    			let fullLink = this.getFullRoute(link);
    			el.setAttribute('href', fullLink);
    			el.addEventListener('click', (e) => {
    				e.preventDefault();
    				this.navigate(link);
    				return false;
    			});
    			el.notRouterInitialized = true;
    		}
    		return this;
    	}

    }

    new notRouter();

    class Lib{
    	constructor(){
    		this.lib = {};
    	}

    	/**
      *
      * @params {string}  mode what to do if element exists [replace|add|skip]
      */
    	add(name, comp, mode = 'replace'){
    		if(this.contains(name)){
    			if(mode === 'replace'){
    				this.lib[name] = comp;
    			}else if(mode === 'add'){
    				this.lib[name] = Object.assign(this.lib[name], comp);
    			}
    		}else {
    			this.lib[name] = comp;
    		}
    	}

    	get(name){
    		return this.lib[name];
    	}

    	contains(name){
    		return Object.prototype.hasOwnProperty.call(this.lib, name);
    	}

    	import(bulk, mode = 'replace'){
    		for(let f in bulk){
    			this.add(f, bulk[f], mode);
    		}
    	}
    }

    /*
    * Библиотека UI конструкторов
    */

    const COMPONENTS$1 = new Lib();

    /* node_modules/not-bulma/src/ui.user.card.svelte generated by Svelte v3.35.0 */

    function create_fragment$z(ctx) {
    	let article;
    	let figure;
    	let p0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let div0;
    	let p1;
    	let strong0;
    	let t1;
    	let t2;
    	let small;
    	let t4;
    	let strong1;
    	let t5;

    	return {
    		c() {
    			article = element("article");
    			figure = element("figure");
    			p0 = element("p");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			p1 = element("p");
    			strong0 = element("strong");
    			t1 = text(/*username*/ ctx[0]);
    			t2 = space();
    			small = element("small");
    			small.textContent = "@";
    			t4 = space();
    			strong1 = element("strong");
    			t5 = text(/*role*/ ctx[1]);
    			if (img.src !== (img_src_value = /*image*/ ctx[2])) attr(img, "src", img_src_value);
    			attr(img, "alt", /*username*/ ctx[0]);
    			attr(p0, "class", "image is-32x32");
    			attr(figure, "class", "media-left");
    			attr(div0, "class", "content");
    			attr(div1, "class", "media-content");
    			attr(article, "id", /*getCompId*/ ctx[3]());
    			attr(article, "class", "media");
    		},
    		m(target, anchor) {
    			insert(target, article, anchor);
    			append(article, figure);
    			append(figure, p0);
    			append(p0, img);
    			append(article, t0);
    			append(article, div1);
    			append(div1, div0);
    			append(div0, p1);
    			append(p1, strong0);
    			append(strong0, t1);
    			append(p1, t2);
    			append(p1, small);
    			append(p1, t4);
    			append(p1, strong1);
    			append(strong1, t5);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*image*/ 4 && img.src !== (img_src_value = /*image*/ ctx[2])) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*username*/ 1) {
    				attr(img, "alt", /*username*/ ctx[0]);
    			}

    			if (dirty & /*username*/ 1) set_data(t1, /*username*/ ctx[0]);
    			if (dirty & /*role*/ 2) set_data(t5, /*role*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(article);
    		}
    	};
    }

    function instance$z($$self, $$props, $$invalidate) {
    	let { id = "userCard" } = $$props;
    	let { image = "https://bulma.io/images/placeholders/32x32.png" } = $$props;
    	let { username = "John Doe" } = $$props;
    	let { role = "admin" } = $$props;
    	let { events = {} } = $$props; //events to react on
    	let { register = notCommon.registerWidgetEvents } = $$props;

    	let { onUpdate = data => {
    		if (Object.prototype.hasOwnProperty.call(data, "username")) {
    			$$invalidate(0, username = data.username);
    		}

    		if (Object.prototype.hasOwnProperty.call(data, "role")) {
    			$$invalidate(1, role = data.role);
    		}
    	} } = $$props;

    	function getCompId() {
    		return `usercard-${id}`;
    	}

    	function getStandartUpdateEventName() {
    		let compId = getCompId();
    		return `${compId}:update`;
    	}

    	onMount(() => {
    		if (!Object.prototype.hasOwnProperty(events, getStandartUpdateEventName())) {
    			$$invalidate(4, events[getStandartUpdateEventName()] = onUpdate, events);
    		}

    		register(events);
    	});

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(5, id = $$props.id);
    		if ("image" in $$props) $$invalidate(2, image = $$props.image);
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    		if ("role" in $$props) $$invalidate(1, role = $$props.role);
    		if ("events" in $$props) $$invalidate(4, events = $$props.events);
    		if ("register" in $$props) $$invalidate(6, register = $$props.register);
    		if ("onUpdate" in $$props) $$invalidate(7, onUpdate = $$props.onUpdate);
    	};

    	return [username, role, image, getCompId, events, id, register, onUpdate];
    }

    class Ui_user_card extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$z, create_fragment$z, safe_not_equal, {
    			id: 5,
    			image: 2,
    			username: 0,
    			role: 1,
    			events: 4,
    			register: 6,
    			onUpdate: 7
    		});
    	}
    }

    /* node_modules/not-bulma/src/ui.indicator.svelte generated by Svelte v3.35.0 */

    function create_fragment$y(ctx) {
    	let span;
    	let t_value = /*labels*/ ctx[2][/*state*/ ctx[0]] + "";
    	let t;
    	let span_class_value;

    	return {
    		c() {
    			span = element("span");
    			t = text(t_value);

    			attr(span, "class", span_class_value = "tag\nis-" + /*size*/ ctx[1] + "\n" + (/*bold*/ ctx[5] ? "has-text-weight-bold" : "") + "\n" + (/*padding*/ ctx[4] !== "normal"
    			? `is-padded-${/*padding*/ ctx[4]}`
    			: "") + "\n" + (/*sided*/ ctx[10] ? "is-sided" : "") + "\n" + (/*right*/ ctx[6] ? "is-sided-right" : "") + "\n" + (/*left*/ ctx[7] ? "is-sided-left" : "") + "\n" + (/*top*/ ctx[8] ? "is-sided-top" : "") + "\n" + (/*bottom*/ ctx[9] ? "is-sided-bottom" : "") + "\n  is-" + /*state*/ ctx[0] + " " + /*classes*/ ctx[3] + "\n  ");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*labels, state*/ 5 && t_value !== (t_value = /*labels*/ ctx[2][/*state*/ ctx[0]] + "")) set_data(t, t_value);

    			if (dirty & /*size, bold, padding, sided, right, left, top, bottom, state, classes*/ 2043 && span_class_value !== (span_class_value = "tag\nis-" + /*size*/ ctx[1] + "\n" + (/*bold*/ ctx[5] ? "has-text-weight-bold" : "") + "\n" + (/*padding*/ ctx[4] !== "normal"
    			? `is-padded-${/*padding*/ ctx[4]}`
    			: "") + "\n" + (/*sided*/ ctx[10] ? "is-sided" : "") + "\n" + (/*right*/ ctx[6] ? "is-sided-right" : "") + "\n" + (/*left*/ ctx[7] ? "is-sided-left" : "") + "\n" + (/*top*/ ctx[8] ? "is-sided-top" : "") + "\n" + (/*bottom*/ ctx[9] ? "is-sided-bottom" : "") + "\n  is-" + /*state*/ ctx[0] + " " + /*classes*/ ctx[3] + "\n  ")) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    function instance$y($$self, $$props, $$invalidate) {
    	let { id = "tagId" } = $$props;
    	let { state = "light" } = $$props;
    	let { size = "normal" } = $$props;

    	let { labels = {
    		black: "black",
    		dark: "dark",
    		light: "light",
    		white: "white",
    		primary: "primary",
    		link: "link",
    		info: "info",
    		success: "success",
    		warning: "warning",
    		danger: "danger"
    	} } = $$props;

    	let { classes = "mx-1" } = $$props;
    	let { padding = "normal" } = $$props;
    	let { bold = false } = $$props;
    	let { right = false } = $$props;
    	let { left = false } = $$props;
    	let { top = false } = $$props;
    	let { bottom = false } = $$props;
    	let sided = false;
    	let { events = {} } = $$props; //events to react on
    	let { register = notCommon.registerWidgetEvents.bind(notCommon) } = $$props;

    	let { onUpdate = data => {
    		if (Object.prototype.hasOwnProperty.call(data, "state")) {
    			$$invalidate(0, state = data.state);
    		}
    	} } = $$props;

    	function getStandartUpdateEventName() {
    		return `indicator-${id}:update`;
    	}

    	onMount(() => {
    		if (!Object.prototype.hasOwnProperty(events, getStandartUpdateEventName())) {
    			$$invalidate(11, events[getStandartUpdateEventName()] = onUpdate, events);
    		}

    		register(events);
    	});

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(12, id = $$props.id);
    		if ("state" in $$props) $$invalidate(0, state = $$props.state);
    		if ("size" in $$props) $$invalidate(1, size = $$props.size);
    		if ("labels" in $$props) $$invalidate(2, labels = $$props.labels);
    		if ("classes" in $$props) $$invalidate(3, classes = $$props.classes);
    		if ("padding" in $$props) $$invalidate(4, padding = $$props.padding);
    		if ("bold" in $$props) $$invalidate(5, bold = $$props.bold);
    		if ("right" in $$props) $$invalidate(6, right = $$props.right);
    		if ("left" in $$props) $$invalidate(7, left = $$props.left);
    		if ("top" in $$props) $$invalidate(8, top = $$props.top);
    		if ("bottom" in $$props) $$invalidate(9, bottom = $$props.bottom);
    		if ("events" in $$props) $$invalidate(11, events = $$props.events);
    		if ("register" in $$props) $$invalidate(13, register = $$props.register);
    		if ("onUpdate" in $$props) $$invalidate(14, onUpdate = $$props.onUpdate);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*right, left, top, bottom*/ 960) {
    			$$invalidate(10, sided = right || left || top || bottom);
    		}
    	};

    	return [
    		state,
    		size,
    		labels,
    		classes,
    		padding,
    		bold,
    		right,
    		left,
    		top,
    		bottom,
    		sided,
    		events,
    		id,
    		register,
    		onUpdate
    	];
    }

    class Ui_indicator extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$y, create_fragment$y, safe_not_equal, {
    			id: 12,
    			state: 0,
    			size: 1,
    			labels: 2,
    			classes: 3,
    			padding: 4,
    			bold: 5,
    			right: 6,
    			left: 7,
    			top: 8,
    			bottom: 9,
    			events: 11,
    			register: 13,
    			onUpdate: 14
    		});
    	}
    }

    /* node_modules/not-bulma/src/sidemenu/ui.trigger.svelte generated by Svelte v3.35.0 */

    function create_fragment$x(ctx) {
    	let span;
    	let i;
    	let i_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");

    			attr(i, "class", i_class_value = "fas " + (/*closed*/ ctx[0]
    			? /*icon_closed*/ ctx[2]
    			: /*icon_opened*/ ctx[1]));

    			attr(i, "aria-hidden", "true");
    			attr(span, "class", "icon is-small is-toggle-submenu is-pulled-right");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);

    			if (!mounted) {
    				dispose = listen(span, "click", /*onClick*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*closed, icon_closed, icon_opened*/ 7 && i_class_value !== (i_class_value = "fas " + (/*closed*/ ctx[0]
    			? /*icon_closed*/ ctx[2]
    			: /*icon_opened*/ ctx[1]))) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$x($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

    	const CLASS_ICON = {
    		OPENED: "fa-angle-down",
    		CLOSED: "fa-angle-up"
    	};

    	let { icon_opened = CLASS_ICON.OPENED } = $$props;
    	let { icon_closed = CLASS_ICON.CLOSED } = $$props;
    	let { closed = false } = $$props;

    	function onClick(e) {
    		e && e.preventDefault();
    		$$invalidate(0, closed = !closed);
    		dispatch("toggle", { closed });
    		return false;
    	}

    	$$self.$$set = $$props => {
    		if ("icon_opened" in $$props) $$invalidate(1, icon_opened = $$props.icon_opened);
    		if ("icon_closed" in $$props) $$invalidate(2, icon_closed = $$props.icon_closed);
    		if ("closed" in $$props) $$invalidate(0, closed = $$props.closed);
    	};

    	return [closed, icon_opened, icon_closed, onClick];
    }

    class Ui_trigger extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$x, create_fragment$x, safe_not_equal, {
    			icon_opened: 1,
    			icon_closed: 2,
    			closed: 0
    		});
    	}
    }

    /* node_modules/not-bulma/src/ui.icon.font.svelte generated by Svelte v3.35.0 */

    function create_else_block$n(ctx) {
    	let span;
    	let i;
    	let i_class_value;
    	let span_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*font*/ ctx[1]);
    			attr(span, "class", span_class_value = "icon " + (/*size*/ ctx[2] ? `is-${/*size*/ ctx[2]}` : "") + " " + (/*size*/ ctx[2] == "medium" ? "fa-lg" : "") + "\n" + (/*size*/ ctx[2] == "large" ? "fa-2x" : ""));
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*font*/ 2 && i_class_value !== (i_class_value = "fas fa-" + /*font*/ ctx[1])) {
    				attr(i, "class", i_class_value);
    			}

    			if (dirty & /*size*/ 4 && span_class_value !== (span_class_value = "icon " + (/*size*/ ctx[2] ? `is-${/*size*/ ctx[2]}` : "") + " " + (/*size*/ ctx[2] == "medium" ? "fa-lg" : "") + "\n" + (/*size*/ ctx[2] == "large" ? "fa-2x" : ""))) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (7:0) {#if title}
    function create_if_block$q(ctx) {
    	let span2;
    	let span0;
    	let i;
    	let i_class_value;
    	let span0_class_value;
    	let t0;
    	let span1;
    	let t1;

    	return {
    		c() {
    			span2 = element("span");
    			span0 = element("span");
    			i = element("i");
    			t0 = space();
    			span1 = element("span");
    			t1 = text(/*title*/ ctx[0]);
    			attr(i, "class", i_class_value = "fas\n      fa-" + /*font*/ ctx[1] + "\n      " + (/*size*/ ctx[2] == "medium" ? "fa-lg" : "") + "\n      " + (/*size*/ ctx[2] == "large" ? "fa-2x" : "") + "\n      ");
    			attr(span0, "class", span0_class_value = "icon " + (/*size*/ ctx[2] ? `is-${/*size*/ ctx[2]}` : ""));
    			attr(span2, "class", "icon-text");
    		},
    		m(target, anchor) {
    			insert(target, span2, anchor);
    			append(span2, span0);
    			append(span0, i);
    			append(span2, t0);
    			append(span2, span1);
    			append(span1, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*font, size*/ 6 && i_class_value !== (i_class_value = "fas\n      fa-" + /*font*/ ctx[1] + "\n      " + (/*size*/ ctx[2] == "medium" ? "fa-lg" : "") + "\n      " + (/*size*/ ctx[2] == "large" ? "fa-2x" : "") + "\n      ")) {
    				attr(i, "class", i_class_value);
    			}

    			if (dirty & /*size*/ 4 && span0_class_value !== (span0_class_value = "icon " + (/*size*/ ctx[2] ? `is-${/*size*/ ctx[2]}` : ""))) {
    				attr(span0, "class", span0_class_value);
    			}

    			if (dirty & /*title*/ 1) set_data(t1, /*title*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(span2);
    		}
    	};
    }

    function create_fragment$w(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*title*/ ctx[0]) return create_if_block$q;
    		return create_else_block$n;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$w($$self, $$props, $$invalidate) {
    	let { title = "" } = $$props;
    	let { font = "" } = $$props;
    	let { size = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("font" in $$props) $$invalidate(1, font = $$props.font);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    	};

    	return [title, font, size];
    }

    class Ui_icon_font extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$w, create_fragment$w, safe_not_equal, { title: 0, font: 1, size: 2 });
    	}
    }

    /* node_modules/not-bulma/src/sidemenu/ui.item.label.svelte generated by Svelte v3.35.0 */

    function create_else_block$m(ctx) {
    	let t_value = /*item*/ ctx[0].title + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*item*/ 1 && t_value !== (t_value = /*item*/ ctx[0].title + "")) set_data(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (12:94) 
    function create_if_block_3$d(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ id: /*item*/ ctx[0].id }, /*item*/ ctx[0].props];
    	var switch_value = COMPONENTS$1.get(/*item*/ ctx[0].component);

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*item*/ 1)
    			? get_spread_update(switch_instance_spread_levels, [{ id: /*item*/ ctx[0].id }, get_spread_object(/*item*/ ctx[0].props)])
    			: {};

    			if (switch_value !== (switch_value = COMPONENTS$1.get(/*item*/ ctx[0].component))) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (10:0) {#if item.icon }
    function create_if_block_2$e(ctx) {
    	let uiicon;
    	let current;
    	const uiicon_spread_levels = [/*item*/ ctx[0].icon];
    	let uiicon_props = {};

    	for (let i = 0; i < uiicon_spread_levels.length; i += 1) {
    		uiicon_props = assign(uiicon_props, uiicon_spread_levels[i]);
    	}

    	uiicon = new Ui_icon_font({ props: uiicon_props });

    	return {
    		c() {
    			create_component(uiicon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiicon, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiicon_changes = (dirty & /*item*/ 1)
    			? get_spread_update(uiicon_spread_levels, [get_spread_object(/*item*/ ctx[0].icon)])
    			: {};

    			uiicon.$set(uiicon_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiicon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiicon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiicon, detaching);
    		}
    	};
    }

    // (21:0) {#if item.tag }
    function create_if_block_1$i(ctx) {
    	let uiindicator;
    	let current;
    	const uiindicator_spread_levels = [{ id: /*item*/ ctx[0].id }, /*item*/ ctx[0].tag];
    	let uiindicator_props = {};

    	for (let i = 0; i < uiindicator_spread_levels.length; i += 1) {
    		uiindicator_props = assign(uiindicator_props, uiindicator_spread_levels[i]);
    	}

    	uiindicator = new Ui_indicator({ props: uiindicator_props });

    	return {
    		c() {
    			create_component(uiindicator.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiindicator, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiindicator_changes = (dirty & /*item*/ 1)
    			? get_spread_update(uiindicator_spread_levels, [{ id: /*item*/ ctx[0].id }, get_spread_object(/*item*/ ctx[0].tag)])
    			: {};

    			uiindicator.$set(uiindicator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiindicator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiindicator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiindicator, detaching);
    		}
    	};
    }

    // (24:0) {#if item.indicator }
    function create_if_block$p(ctx) {
    	let uiindicator;
    	let current;
    	const uiindicator_spread_levels = [{ id: /*item*/ ctx[0].id }, /*item*/ ctx[0].indicator];
    	let uiindicator_props = {};

    	for (let i = 0; i < uiindicator_spread_levels.length; i += 1) {
    		uiindicator_props = assign(uiindicator_props, uiindicator_spread_levels[i]);
    	}

    	uiindicator = new Ui_indicator({ props: uiindicator_props });

    	return {
    		c() {
    			create_component(uiindicator.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiindicator, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiindicator_changes = (dirty & /*item*/ 1)
    			? get_spread_update(uiindicator_spread_levels, [{ id: /*item*/ ctx[0].id }, get_spread_object(/*item*/ ctx[0].indicator)])
    			: {};

    			uiindicator.$set(uiindicator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiindicator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiindicator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiindicator, detaching);
    		}
    	};
    }

    function create_fragment$v(ctx) {
    	let show_if;
    	let current_block_type_index;
    	let if_block0;
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	const if_block_creators = [create_if_block_2$e, create_if_block_3$d, create_else_block$m];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*item*/ ctx[0].icon) return 0;
    		if (dirty & /*item*/ 1) show_if = !!(/*item*/ ctx[0].type === "component" && /*item*/ ctx[0].component && COMPONENTS$1.contains(/*item*/ ctx[0].component));
    		if (show_if) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx, -1);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block1 = /*item*/ ctx[0].tag && create_if_block_1$i(ctx);
    	let if_block2 = /*item*/ ctx[0].indicator && create_if_block$p(ctx);

    	return {
    		c() {
    			if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx, dirty);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				} else {
    					if_block0.p(ctx, dirty);
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(t0.parentNode, t0);
    			}

    			if (/*item*/ ctx[0].tag) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*item*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_1$i(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*item*/ ctx[0].indicator) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*item*/ 1) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block$p(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    		}
    	};
    }

    function instance$v($$self, $$props, $$invalidate) {
    	let { item = {} } = $$props;

    	$$self.$$set = $$props => {
    		if ("item" in $$props) $$invalidate(0, item = $$props.item);
    	};

    	return [item];
    }

    class Ui_item_label extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$v, create_fragment$v, safe_not_equal, { item: 0 });
    	}
    }

    /* node_modules/not-bulma/src/sidemenu/ui.item.with.children.svelte generated by Svelte v3.35.0 */

    function create_else_block$l(ctx) {
    	let uisidemenuitemlabel;
    	let t;
    	let uisidemenutrigger;
    	let current;
    	uisidemenuitemlabel = new Ui_item_label({ props: { item: /*item*/ ctx[2] } });
    	uisidemenutrigger = new Ui_trigger({ props: { closed: /*closed*/ ctx[0] } });
    	uisidemenutrigger.$on("toggle", /*toggle*/ ctx[3]);

    	return {
    		c() {
    			create_component(uisidemenuitemlabel.$$.fragment);
    			t = space();
    			create_component(uisidemenutrigger.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uisidemenuitemlabel, target, anchor);
    			insert(target, t, anchor);
    			mount_component(uisidemenutrigger, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uisidemenuitemlabel_changes = {};
    			if (dirty & /*item*/ 4) uisidemenuitemlabel_changes.item = /*item*/ ctx[2];
    			uisidemenuitemlabel.$set(uisidemenuitemlabel_changes);
    			const uisidemenutrigger_changes = {};
    			if (dirty & /*closed*/ 1) uisidemenutrigger_changes.closed = /*closed*/ ctx[0];
    			uisidemenutrigger.$set(uisidemenutrigger_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uisidemenuitemlabel.$$.fragment, local);
    			transition_in(uisidemenutrigger.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uisidemenuitemlabel.$$.fragment, local);
    			transition_out(uisidemenutrigger.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uisidemenuitemlabel, detaching);
    			if (detaching) detach(t);
    			destroy_component(uisidemenutrigger, detaching);
    		}
    	};
    }

    // (29:2) {#if (typeof item.url !== 'undefined' && item.url!==false) }
    function create_if_block$o(ctx) {
    	let a;
    	let uisidemenuitemlabel;
    	let t;
    	let uisidemenutrigger;
    	let a_href_value;
    	let a_data_href_value;
    	let current;
    	let mounted;
    	let dispose;
    	uisidemenuitemlabel = new Ui_item_label({ props: { item: /*item*/ ctx[2] } });
    	uisidemenutrigger = new Ui_trigger({ props: { closed: /*closed*/ ctx[0] } });
    	uisidemenutrigger.$on("toggle", /*toggle*/ ctx[3]);

    	return {
    		c() {
    			a = element("a");
    			create_component(uisidemenuitemlabel.$$.fragment);
    			t = space();
    			create_component(uisidemenutrigger.$$.fragment);
    			attr(a, "href", a_href_value = "" + (/*root*/ ctx[1] + /*item*/ ctx[2].url));
    			attr(a, "data-href", a_data_href_value = /*item*/ ctx[2].url);
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			mount_component(uisidemenuitemlabel, a, null);
    			append(a, t);
    			mount_component(uisidemenutrigger, a, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(a, "click", /*onClick*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			const uisidemenuitemlabel_changes = {};
    			if (dirty & /*item*/ 4) uisidemenuitemlabel_changes.item = /*item*/ ctx[2];
    			uisidemenuitemlabel.$set(uisidemenuitemlabel_changes);
    			const uisidemenutrigger_changes = {};
    			if (dirty & /*closed*/ 1) uisidemenutrigger_changes.closed = /*closed*/ ctx[0];
    			uisidemenutrigger.$set(uisidemenutrigger_changes);

    			if (!current || dirty & /*root, item*/ 6 && a_href_value !== (a_href_value = "" + (/*root*/ ctx[1] + /*item*/ ctx[2].url))) {
    				attr(a, "href", a_href_value);
    			}

    			if (!current || dirty & /*item*/ 4 && a_data_href_value !== (a_data_href_value = /*item*/ ctx[2].url)) {
    				attr(a, "data-href", a_data_href_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uisidemenuitemlabel.$$.fragment, local);
    			transition_in(uisidemenutrigger.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uisidemenuitemlabel.$$.fragment, local);
    			transition_out(uisidemenutrigger.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    			destroy_component(uisidemenuitemlabel);
    			destroy_component(uisidemenutrigger);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$u(ctx) {
    	let li;
    	let current_block_type_index;
    	let if_block;
    	let t;
    	let uisidemenuitems;
    	let li_class_value;
    	let current;
    	const if_block_creators = [create_if_block$o, create_else_block$l];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (typeof /*item*/ ctx[2].url !== "undefined" && /*item*/ ctx[2].url !== false) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	uisidemenuitems = new Ui_items({
    			props: {
    				root: /*root*/ ctx[1],
    				items: /*item*/ ctx[2].items,
    				closed: /*closed*/ ctx[0]
    			}
    		});

    	uisidemenuitems.$on("navigate", /*navigate_handler*/ ctx[5]);

    	return {
    		c() {
    			li = element("li");
    			if_block.c();
    			t = space();
    			create_component(uisidemenuitems.$$.fragment);

    			attr(li, "class", li_class_value = "" + ((typeof /*item*/ ctx[2].url === "undefined" || /*item*/ ctx[2].url === false
    			? ""
    			: "is-no-follow-subtitle") + " " + /*item*/ ctx[2].classes));
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			if_blocks[current_block_type_index].m(li, null);
    			append(li, t);
    			mount_component(uisidemenuitems, li, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(li, t);
    			}

    			const uisidemenuitems_changes = {};
    			if (dirty & /*root*/ 2) uisidemenuitems_changes.root = /*root*/ ctx[1];
    			if (dirty & /*item*/ 4) uisidemenuitems_changes.items = /*item*/ ctx[2].items;
    			if (dirty & /*closed*/ 1) uisidemenuitems_changes.closed = /*closed*/ ctx[0];
    			uisidemenuitems.$set(uisidemenuitems_changes);

    			if (!current || dirty & /*item*/ 4 && li_class_value !== (li_class_value = "" + ((typeof /*item*/ ctx[2].url === "undefined" || /*item*/ ctx[2].url === false
    			? ""
    			: "is-no-follow-subtitle") + " " + /*item*/ ctx[2].classes))) {
    				attr(li, "class", li_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(uisidemenuitems.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			transition_out(uisidemenuitems.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			if_blocks[current_block_type_index].d();
    			destroy_component(uisidemenuitems);
    		}
    	};
    }

    function instance$u($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { root = "" } = $$props;
    	let { item = {} } = $$props;
    	let { closed = false } = $$props;

    	function toggle({ detail }) {
    		$$invalidate(0, closed = detail.closed);
    	}

    	function onClick(ev) {
    		ev.preventDefault();

    		dispatch("navigate", {
    			full: ev.target.getAttribute("href"),
    			short: ev.target.dataset.href
    		});

    		return false;
    	}

    	function navigate_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("root" in $$props) $$invalidate(1, root = $$props.root);
    		if ("item" in $$props) $$invalidate(2, item = $$props.item);
    		if ("closed" in $$props) $$invalidate(0, closed = $$props.closed);
    	};

    	return [closed, root, item, toggle, onClick, navigate_handler];
    }

    class Ui_item_with_children extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$u, create_fragment$u, safe_not_equal, { root: 1, item: 2, closed: 0 });
    	}
    }

    /* node_modules/not-bulma/src/sidemenu/ui.item.without.children.svelte generated by Svelte v3.35.0 */

    function create_else_block$k(ctx) {
    	let li;
    	let t0_value = /*item*/ ctx[1].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let li_class_value;
    	let current;
    	let if_block0 = /*item*/ ctx[1].tag && create_if_block_4$b(ctx);
    	let if_block1 = /*item*/ ctx[1].indicator && create_if_block_3$c(ctx);

    	return {
    		c() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			attr(li, "class", li_class_value = "is-no-follow-subtitle " + /*item*/ ctx[1].classes);
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, t0);
    			append(li, t1);
    			if (if_block0) if_block0.m(li, null);
    			append(li, t2);
    			if (if_block1) if_block1.m(li, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*item*/ 2) && t0_value !== (t0_value = /*item*/ ctx[1].title + "")) set_data(t0, t0_value);

    			if (/*item*/ ctx[1].tag) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*item*/ 2) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_4$b(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(li, t2);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*item*/ ctx[1].indicator) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*item*/ 2) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_3$c(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(li, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*item*/ 2 && li_class_value !== (li_class_value = "is-no-follow-subtitle " + /*item*/ ctx[1].classes)) {
    				attr(li, "class", li_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};
    }

    // (21:0) {#if (typeof item.url !== 'undefined' && item.url!==false) }
    function create_if_block$n(ctx) {
    	let li;
    	let a;
    	let t0_value = /*item*/ ctx[1].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let a_href_value;
    	let a_data_href_value;
    	let li_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*item*/ ctx[1].tag && create_if_block_2$d(ctx);
    	let if_block1 = /*item*/ ctx[1].indicator && create_if_block_1$h(ctx);

    	return {
    		c() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			attr(a, "href", a_href_value = "" + (/*root*/ ctx[0] + /*item*/ ctx[1].url));
    			attr(a, "data-href", a_data_href_value = /*item*/ ctx[1].url);
    			attr(li, "class", li_class_value = /*item*/ ctx[1].classes);
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, a);
    			append(a, t0);
    			append(a, t1);
    			if (if_block0) if_block0.m(a, null);
    			append(a, t2);
    			if (if_block1) if_block1.m(a, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(a, "click", /*onClick*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*item*/ 2) && t0_value !== (t0_value = /*item*/ ctx[1].title + "")) set_data(t0, t0_value);

    			if (/*item*/ ctx[1].tag) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*item*/ 2) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2$d(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(a, t2);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*item*/ ctx[1].indicator) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*item*/ 2) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_1$h(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(a, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*root, item*/ 3 && a_href_value !== (a_href_value = "" + (/*root*/ ctx[0] + /*item*/ ctx[1].url))) {
    				attr(a, "href", a_href_value);
    			}

    			if (!current || dirty & /*item*/ 2 && a_data_href_value !== (a_data_href_value = /*item*/ ctx[1].url)) {
    				attr(a, "data-href", a_data_href_value);
    			}

    			if (!current || dirty & /*item*/ 2 && li_class_value !== (li_class_value = /*item*/ ctx[1].classes)) {
    				attr(li, "class", li_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (35:2) {#if item.tag }
    function create_if_block_4$b(ctx) {
    	let uiindicator;
    	let current;
    	const uiindicator_spread_levels = [{ id: /*item*/ ctx[1].id }, /*item*/ ctx[1].tag];
    	let uiindicator_props = {};

    	for (let i = 0; i < uiindicator_spread_levels.length; i += 1) {
    		uiindicator_props = assign(uiindicator_props, uiindicator_spread_levels[i]);
    	}

    	uiindicator = new Ui_indicator({ props: uiindicator_props });

    	return {
    		c() {
    			create_component(uiindicator.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiindicator, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiindicator_changes = (dirty & /*item*/ 2)
    			? get_spread_update(uiindicator_spread_levels, [{ id: /*item*/ ctx[1].id }, get_spread_object(/*item*/ ctx[1].tag)])
    			: {};

    			uiindicator.$set(uiindicator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiindicator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiindicator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiindicator, detaching);
    		}
    	};
    }

    // (38:2) {#if item.indicator }
    function create_if_block_3$c(ctx) {
    	let uiindicator;
    	let current;
    	const uiindicator_spread_levels = [{ id: /*item*/ ctx[1].id }, /*item*/ ctx[1].indicator];
    	let uiindicator_props = {};

    	for (let i = 0; i < uiindicator_spread_levels.length; i += 1) {
    		uiindicator_props = assign(uiindicator_props, uiindicator_spread_levels[i]);
    	}

    	uiindicator = new Ui_indicator({ props: uiindicator_props });

    	return {
    		c() {
    			create_component(uiindicator.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiindicator, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiindicator_changes = (dirty & /*item*/ 2)
    			? get_spread_update(uiindicator_spread_levels, [{ id: /*item*/ ctx[1].id }, get_spread_object(/*item*/ ctx[1].indicator)])
    			: {};

    			uiindicator.$set(uiindicator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiindicator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiindicator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiindicator, detaching);
    		}
    	};
    }

    // (25:2) {#if item.tag }
    function create_if_block_2$d(ctx) {
    	let uiindicator;
    	let current;
    	const uiindicator_spread_levels = [{ id: /*item*/ ctx[1].id }, /*item*/ ctx[1].tag];
    	let uiindicator_props = {};

    	for (let i = 0; i < uiindicator_spread_levels.length; i += 1) {
    		uiindicator_props = assign(uiindicator_props, uiindicator_spread_levels[i]);
    	}

    	uiindicator = new Ui_indicator({ props: uiindicator_props });

    	return {
    		c() {
    			create_component(uiindicator.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiindicator, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiindicator_changes = (dirty & /*item*/ 2)
    			? get_spread_update(uiindicator_spread_levels, [{ id: /*item*/ ctx[1].id }, get_spread_object(/*item*/ ctx[1].tag)])
    			: {};

    			uiindicator.$set(uiindicator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiindicator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiindicator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiindicator, detaching);
    		}
    	};
    }

    // (28:2) {#if item.indicator }
    function create_if_block_1$h(ctx) {
    	let uiindicator;
    	let current;
    	const uiindicator_spread_levels = [{ id: /*item*/ ctx[1].id }, /*item*/ ctx[1].indicator];
    	let uiindicator_props = {};

    	for (let i = 0; i < uiindicator_spread_levels.length; i += 1) {
    		uiindicator_props = assign(uiindicator_props, uiindicator_spread_levels[i]);
    	}

    	uiindicator = new Ui_indicator({ props: uiindicator_props });

    	return {
    		c() {
    			create_component(uiindicator.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiindicator, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiindicator_changes = (dirty & /*item*/ 2)
    			? get_spread_update(uiindicator_spread_levels, [{ id: /*item*/ ctx[1].id }, get_spread_object(/*item*/ ctx[1].indicator)])
    			: {};

    			uiindicator.$set(uiindicator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiindicator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiindicator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiindicator, detaching);
    		}
    	};
    }

    function create_fragment$t(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$n, create_else_block$k];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (typeof /*item*/ ctx[1].url !== "undefined" && /*item*/ ctx[1].url !== false) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$t($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { root = "" } = $$props;
    	let { item = {} } = $$props;

    	function onClick(ev) {
    		ev.preventDefault();

    		dispatch("navigate", {
    			full: ev.target.getAttribute("href"),
    			short: ev.target.dataset.href
    		});

    		return false;
    	}

    	$$self.$$set = $$props => {
    		if ("root" in $$props) $$invalidate(0, root = $$props.root);
    		if ("item" in $$props) $$invalidate(1, item = $$props.item);
    	};

    	return [root, item, onClick];
    }

    class Ui_item_without_children extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$t, create_fragment$t, safe_not_equal, { root: 0, item: 1 });
    	}
    }

    /* node_modules/not-bulma/src/sidemenu/ui.items.svelte generated by Svelte v3.35.0 */

    function get_each_context$9(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (16:1) {:else}
    function create_else_block$j(ctx) {
    	let uisidemenuitemwithoutchildren;
    	let current;

    	uisidemenuitemwithoutchildren = new Ui_item_without_children({
    			props: {
    				root: /*root*/ ctx[0],
    				item: /*item*/ ctx[5]
    			}
    		});

    	uisidemenuitemwithoutchildren.$on("navigate", /*navigate_handler_1*/ ctx[4]);

    	return {
    		c() {
    			create_component(uisidemenuitemwithoutchildren.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uisidemenuitemwithoutchildren, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uisidemenuitemwithoutchildren_changes = {};
    			if (dirty & /*root*/ 1) uisidemenuitemwithoutchildren_changes.root = /*root*/ ctx[0];
    			if (dirty & /*items*/ 2) uisidemenuitemwithoutchildren_changes.item = /*item*/ ctx[5];
    			uisidemenuitemwithoutchildren.$set(uisidemenuitemwithoutchildren_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uisidemenuitemwithoutchildren.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uisidemenuitemwithoutchildren.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uisidemenuitemwithoutchildren, detaching);
    		}
    	};
    }

    // (14:1) {#if item.items && item.items.length }
    function create_if_block$m(ctx) {
    	let uisidemenuitemwithchildren;
    	let current;

    	uisidemenuitemwithchildren = new Ui_item_with_children({
    			props: {
    				root: /*root*/ ctx[0],
    				item: /*item*/ ctx[5]
    			}
    		});

    	uisidemenuitemwithchildren.$on("navigate", /*navigate_handler*/ ctx[3]);

    	return {
    		c() {
    			create_component(uisidemenuitemwithchildren.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uisidemenuitemwithchildren, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uisidemenuitemwithchildren_changes = {};
    			if (dirty & /*root*/ 1) uisidemenuitemwithchildren_changes.root = /*root*/ ctx[0];
    			if (dirty & /*items*/ 2) uisidemenuitemwithchildren_changes.item = /*item*/ ctx[5];
    			uisidemenuitemwithchildren.$set(uisidemenuitemwithchildren_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uisidemenuitemwithchildren.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uisidemenuitemwithchildren.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uisidemenuitemwithchildren, detaching);
    		}
    	};
    }

    // (13:0) {#each items as item}
    function create_each_block$9(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$m, create_else_block$j];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*item*/ ctx[5].items && /*item*/ ctx[5].items.length) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$s(ctx) {
    	let ul;
    	let ul_class_value;
    	let current;
    	let each_value = /*items*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$9(get_each_context$9(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(ul, "class", ul_class_value = "menu-list " + (/*closed*/ ctx[2] ? "is-closed" : ""));
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*root, items*/ 3) {
    				each_value = /*items*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$9(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$9(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*closed*/ 4 && ul_class_value !== (ul_class_value = "menu-list " + (/*closed*/ ctx[2] ? "is-closed" : ""))) {
    				attr(ul, "class", ul_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$s($$self, $$props, $$invalidate) {
    	let { root = "" } = $$props;
    	let { items = [] } = $$props;
    	let { closed = false } = $$props;

    	function navigate_handler(event) {
    		bubble($$self, event);
    	}

    	function navigate_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("root" in $$props) $$invalidate(0, root = $$props.root);
    		if ("items" in $$props) $$invalidate(1, items = $$props.items);
    		if ("closed" in $$props) $$invalidate(2, closed = $$props.closed);
    	};

    	return [root, items, closed, navigate_handler, navigate_handler_1];
    }

    class Ui_items extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, { root: 0, items: 1, closed: 2 });
    	}
    }

    /* node_modules/not-bulma/src/sidemenu/ui.section.svelte generated by Svelte v3.35.0 */

    function create_if_block_1$g(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = (/*sectionItems*/ ctx[2].length || /*section*/ ctx[0].component || /*section*/ ctx[0].tag || /*section*/ ctx[0].indicator) && create_if_block_2$c(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*sectionItems*/ ctx[2].length || /*section*/ ctx[0].component || /*section*/ ctx[0].tag || /*section*/ ctx[0].indicator) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*sectionItems, section*/ 5) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2$c(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (14:0) {#if sectionItems.length || section.component || section.tag || section.indicator }
    function create_if_block_2$c(ctx) {
    	let p;
    	let show_if;
    	let current_block_type_index;
    	let if_block0;
    	let t0;
    	let t1;
    	let p_class_value;
    	let current;
    	const if_block_creators = [create_if_block_5$3, create_else_block$i];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (dirty & /*section*/ 1) show_if = !!(/*section*/ ctx[0].type === "component" && /*section*/ ctx[0].component && COMPONENTS$1.contains(/*section*/ ctx[0].component));
    		if (show_if) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx, -1);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block1 = /*section*/ ctx[0].tag && create_if_block_4$a(ctx);
    	let if_block2 = /*section*/ ctx[0].indicator && create_if_block_3$b(ctx);

    	return {
    		c() {
    			p = element("p");
    			if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			attr(p, "class", p_class_value = "menu-label " + /*section*/ ctx[0].classes);
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			if_blocks[current_block_type_index].m(p, null);
    			append(p, t0);
    			if (if_block1) if_block1.m(p, null);
    			append(p, t1);
    			if (if_block2) if_block2.m(p, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx, dirty);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				} else {
    					if_block0.p(ctx, dirty);
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(p, t0);
    			}

    			if (/*section*/ ctx[0].tag) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*section*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_4$a(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(p, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*section*/ ctx[0].indicator) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*section*/ 1) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_3$b(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(p, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*section*/ 1 && p_class_value !== (p_class_value = "menu-label " + /*section*/ ctx[0].classes)) {
    				attr(p, "class", p_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    			if_blocks[current_block_type_index].d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};
    }

    // (22:2) {:else}
    function create_else_block$i(ctx) {
    	let t_value = /*section*/ ctx[0].title + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*section*/ 1 && t_value !== (t_value = /*section*/ ctx[0].title + "")) set_data(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (16:2) {#if (section.type==='component' && section.component && COMPONENTS.contains(section.component)) }
    function create_if_block_5$3(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ id: /*section*/ ctx[0].id }, /*section*/ ctx[0].props];
    	var switch_value = COMPONENTS$1.get(/*section*/ ctx[0].component);

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*section*/ 1)
    			? get_spread_update(switch_instance_spread_levels, [
    					{ id: /*section*/ ctx[0].id },
    					get_spread_object(/*section*/ ctx[0].props)
    				])
    			: {};

    			if (switch_value !== (switch_value = COMPONENTS$1.get(/*section*/ ctx[0].component))) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (25:2) {#if section.tag }
    function create_if_block_4$a(ctx) {
    	let uiindicator;
    	let current;
    	const uiindicator_spread_levels = [{ id: /*section*/ ctx[0].id }, /*section*/ ctx[0].tag];
    	let uiindicator_props = {};

    	for (let i = 0; i < uiindicator_spread_levels.length; i += 1) {
    		uiindicator_props = assign(uiindicator_props, uiindicator_spread_levels[i]);
    	}

    	uiindicator = new Ui_indicator({ props: uiindicator_props });

    	return {
    		c() {
    			create_component(uiindicator.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiindicator, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiindicator_changes = (dirty & /*section*/ 1)
    			? get_spread_update(uiindicator_spread_levels, [{ id: /*section*/ ctx[0].id }, get_spread_object(/*section*/ ctx[0].tag)])
    			: {};

    			uiindicator.$set(uiindicator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiindicator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiindicator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiindicator, detaching);
    		}
    	};
    }

    // (28:2) {#if section.indicator }
    function create_if_block_3$b(ctx) {
    	let uiindicator;
    	let current;
    	const uiindicator_spread_levels = [{ id: /*section*/ ctx[0].id }, /*section*/ ctx[0].indicator];
    	let uiindicator_props = {};

    	for (let i = 0; i < uiindicator_spread_levels.length; i += 1) {
    		uiindicator_props = assign(uiindicator_props, uiindicator_spread_levels[i]);
    	}

    	uiindicator = new Ui_indicator({ props: uiindicator_props });

    	return {
    		c() {
    			create_component(uiindicator.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiindicator, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiindicator_changes = (dirty & /*section*/ 1)
    			? get_spread_update(uiindicator_spread_levels, [
    					{ id: /*section*/ ctx[0].id },
    					get_spread_object(/*section*/ ctx[0].indicator)
    				])
    			: {};

    			uiindicator.$set(uiindicator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiindicator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiindicator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiindicator, detaching);
    		}
    	};
    }

    // (34:0) {#if sectionItems.length }
    function create_if_block$l(ctx) {
    	let uisidemenuitems;
    	let current;

    	uisidemenuitems = new Ui_items({
    			props: {
    				root: /*root*/ ctx[1],
    				items: /*sectionItems*/ ctx[2]
    			}
    		});

    	uisidemenuitems.$on("navigate", /*navigate_handler*/ ctx[4]);

    	return {
    		c() {
    			create_component(uisidemenuitems.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uisidemenuitems, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uisidemenuitems_changes = {};
    			if (dirty & /*root*/ 2) uisidemenuitems_changes.root = /*root*/ ctx[1];
    			if (dirty & /*sectionItems*/ 4) uisidemenuitems_changes.items = /*sectionItems*/ ctx[2];
    			uisidemenuitems.$set(uisidemenuitems_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uisidemenuitems.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uisidemenuitems.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uisidemenuitems, detaching);
    		}
    	};
    }

    function create_fragment$r(ctx) {
    	let t;
    	let if_block1_anchor;
    	let current;
    	let if_block0 = /*section*/ ctx[0] && create_if_block_1$g(ctx);
    	let if_block1 = /*sectionItems*/ ctx[2].length && create_if_block$l(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*section*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*section*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$g(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*sectionItems*/ ctx[2].length) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*sectionItems*/ 4) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$l(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(if_block1_anchor);
    		}
    	};
    }

    function instance$r($$self, $$props, $$invalidate) {
    	let sectionItems;
    	let { section } = $$props;
    	let { items = [] } = $$props;
    	let { root = "" } = $$props;

    	function navigate_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("section" in $$props) $$invalidate(0, section = $$props.section);
    		if ("items" in $$props) $$invalidate(3, items = $$props.items);
    		if ("root" in $$props) $$invalidate(1, root = $$props.root);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*items, section*/ 9) {
    			$$invalidate(2, sectionItems = items.filter(item => section.id === item.section));
    		}
    	};

    	return [section, root, sectionItems, items, navigate_handler];
    }

    class Ui_section extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, { section: 0, items: 3, root: 1 });
    	}
    }

    /* node_modules/not-bulma/src/sidemenu/ui.side.menu.svelte generated by Svelte v3.35.0 */

    function get_each_context$8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (16:0) {#each sections as section}
    function create_each_block$8(ctx) {
    	let uisidemenusection;
    	let current;

    	uisidemenusection = new Ui_section({
    			props: {
    				section: /*section*/ ctx[5],
    				items: /*items*/ ctx[1],
    				root: /*root*/ ctx[0]
    			}
    		});

    	uisidemenusection.$on("navigate", /*onClick*/ ctx[3]);

    	return {
    		c() {
    			create_component(uisidemenusection.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uisidemenusection, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uisidemenusection_changes = {};
    			if (dirty & /*sections*/ 4) uisidemenusection_changes.section = /*section*/ ctx[5];
    			if (dirty & /*items*/ 2) uisidemenusection_changes.items = /*items*/ ctx[1];
    			if (dirty & /*root*/ 1) uisidemenusection_changes.root = /*root*/ ctx[0];
    			uisidemenusection.$set(uisidemenusection_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uisidemenusection.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uisidemenusection.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uisidemenusection, detaching);
    		}
    	};
    }

    function create_fragment$q(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*sections*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$8(get_each_context$8(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*sections, items, root, onClick*/ 15) {
    				each_value = /*sections*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$8(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$8(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function instance$q($$self, $$props, $$invalidate) {
    	let { root = "" } = $$props;
    	let { items = [] } = $$props;
    	let { sections = [] } = $$props;
    	let { navigate = null } = $$props;

    	function onClick(ev) {
    		if (typeof navigate === "function") {
    			navigate(ev.detail);
    		}
    	}

    	$$self.$$set = $$props => {
    		if ("root" in $$props) $$invalidate(0, root = $$props.root);
    		if ("items" in $$props) $$invalidate(1, items = $$props.items);
    		if ("sections" in $$props) $$invalidate(2, sections = $$props.sections);
    		if ("navigate" in $$props) $$invalidate(4, navigate = $$props.navigate);
    	};

    	return [root, items, sections, onClick, navigate];
    }

    class Ui_side_menu extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$q, create_fragment$q, safe_not_equal, {
    			root: 0,
    			items: 1,
    			sections: 2,
    			navigate: 4
    		});
    	}
    }

    class Menu {
    	static MAX_TOUCH_WIDTH = 1023;
    	static DEFAULT = {
    		section: 'any',
    		sectionTitle: 'Меню',
    		priority: 0,
    		//link, button, dropdown, component
    		type: 			'link',
    	};
    	static app = false;
    	static directNavigation = false;
    	static menu;
    	static options = {
    		directNavigation: false,
    		navigate: (urls) => {
    			this.hide();
    			if (!(this.isDirectNavigation()) && this.app) {
    				let func = this.app.getWorking('router');
    				if (func) {
    					return func.navigate(urls.short);
    				}
    			}
    			document.location.assign(urls.full);
    		}
    	};

    	static items = [];
    	static sections = [];
    	static location;
    	static interval;

    	static setApp(app) {
    		this.app = app;
    		return this;
    	}

    	static setOptions(options) {
    		this.options = {...this.options, ...options};
    		return this;
    	}

    	static getOptionsPathTo(what){
    		return `menu.${this.options.type}.${what}`;
    	}

    	static isDirectNavigation(){
    		return this.app?this.app.getOptions(this.getOptionsPathTo('directNavigation'), this.options.directNavigation):this.options.directNavigation;
    	}

    	static getOptions() {
    		if (this.app) {
    			return {
    				brand:   				this.app.getOptions('brand', this.options.brand ),
    				items: 					this.app.getOptions(this.getOptionsPathTo('items'), this.options.items),
    				sections: 			this.app.getOptions(this.getOptionsPathTo('sections'), this.options.sections),
    				targetSelector: this.app.getOptions(this.getOptionsPathTo('targetSelector'), this.options.targetSelector),
    				toggleSelector: this.app.getOptions(this.getOptionsPathTo('toggleSelector'), this.options.toggleSelector),
    				open: 					this.app.getOptions(this.getOptionsPathTo('open'), this.options.open),
    				directNavigation: 					this.app.getOptions(this.getOptionsPathTo('directNavigation'), this.options.directNavigation),
    				root: 					this.app.getOptions('router.root', this.options.root),
    				navigate: 			this.options.navigate.bind(this),
    				getComponent: 	this.getComponent.bind(this),
    			};
    		} else {
    			return this.options;
    		}
    	}

    	static getComponent(name){
    		if (COMPONENTS$1.contains(name)){
    			return COMPONENTS$1.get(name);
    		}else {
    			return false;
    		}
    	}

    	static initField(list, fields = []) {
    		list.forEach((item) => {
    			fields.forEach((field)=>{
    				if (!Object.prototype.hasOwnProperty.call(item, field)) {
    					item[field] = this.DEFAULT[field];
    				}
    			});
    			if (Object.prototype.hasOwnProperty.call(item, 'items')) {
    				this.initField(item.items, fields);
    			}
    		});
    	}

    	static sortList(list) {
    		list.sort((item1, item2) => {
    			if (Object.prototype.hasOwnProperty.call(item1, 'items')) {
    				this.sortList(item1.items);
    			}
    			if (Object.prototype.hasOwnProperty.call(item2, 'items')) {
    				this.sortList(item2.items);
    			}
    			if (item1.priority === item2.priority) {
    				return item1.title > item2.title ? 1 : -1;
    			} else {
    				return item1.priority < item2.priority ? 1 : -1;
    			}
    		});
    	}

    	static removeDublicates(sections) {
    		for (let i = 0; i < sections.length; i++) {
    			let priority = sections[i].priority;
    			sections
    				.filter((section) => {
    					return section.id === sections[i].id;
    				})
    				.forEach((item, indx) => {
    					if (indx === 0) {
    						return;
    					}
    					if (item.priority < priority) {
    						priority = item.priority;
    					}
    					sections.splice(sections.indexOf(item), 1);
    				});
    			sections[i].priority = priority;
    		}
    		return sections;
    	}

    	static prepareData() {
    		let items = [];
    		items.push(...this.getOptions().items);
    		let sections = [];
    		sections.push(...this.getOptions().sections);

    		this.initField(sections, ['priority']);
    		this.removeDublicates(sections);
    		this.initField(items, ['priority', 'section', 'type']);
    		this.sortList(sections);

    		sections.push({
    			id: this.DEFAULT.section,
    			title: this.DEFAULT.sectionTitle
    		});
    		this.sortList(items);

    		this.sections = sections;
    		this.items = items;
    	}

    	static remove() {
    		if (this.menu) {
    			this.menu.$destroy();
    			this.menu = null;
    			clearInterval(this.interval);
    		}
    	}

    	static updateIndicator(sectionId, itemId, state){
    		this.updateSection(sectionId, (section)=>{
    			section.indicator.state = state;
    		});
    		this.updateItem(itemId, (item)=>{
    			item.indicator.state = state;
    		});
    	}

    	static updateTag(sectionId, itemId, tag){
    		this.updateSection(sectionId, (section)=>{
    			section.tag = tag;
    		});
    		this.updateItem(itemId, (item)=>{
    			item.tag = tag;
    		});
    	}

    	static updateSectionTag(sectionId, tag){
    		this.updateSection(sectionId, (section)=>{
    			section.tag = {...section.tag, ...tag};
    		});
    	}

    	static updateItemTag(itemId, tag){
    		this.updateItem(itemId, (item)=>{
    			item.tag = {...item.tag, ...tag};
    		});
    	}

    	static updateSection(sectionId, proc){
    		if(this.sections && sectionId){
    			for(let section in this.sections){
    				if( this.sections[section].id !== sectionId ) continue;
    				proc(this.sections[section]);
    			}
    			if(this.menu){
    				this.menu.$set({ sections: this.sections });
    			}
    		}
    	}

    	static updateSectionItems(sectionId, proc){
    		if(this.sections && sectionId){
    			let oldList = this.items.filter(item =>item.section === sectionId);
    			for(let i of oldList){
    				this.items.splice(this.items.indexOf(i), 1);
    			}
    			this.items.push(...proc(oldList));
    			if(this.menu){
    				this.menu.$set({ items: this.items });
    			}
    		}
    	}

    	static updateItem(itemId, proc){
    		if(itemId && this.items){
    			this.items.forEach((item)=>{
    				if (item.id !== itemId) return;
    				proc(item);
    			});
    			if(this.menu){
    				this.menu.$set({ items: this.items });
    			}
    		}
    	}

    	static isTouch(){
    		return window.innerWidth <= this.MAX_TOUCH_WIDTH;
    	}

    	static getSectionComponent(){

    	}

    }

    const TYPE = 'side';

    class SideMenu extends Menu {
    	static nav;
    	static main;
    	static aside;

    	static DEFAULT = {
    		section: 'any',
    		sectionTitle: 'Меню',
    		priority: 0,
    		open: false
    	};

    	static options = {
    		type: TYPE,
    		items: [],
    		sections: [],
    		targetSelector: `#${TYPE}-menu`,
    		toggleSelector: `.${TYPE}-menu-toggle`,
    		root: '/',
    		open: false,
        navigate: (urls) => {
    			this.hide();
    			if (!(this.isDirectNavigation()) && this.app) {
    				let func = this.app.getWorking('router');
    				if (func) {
    					return func.navigate(urls.short);
    				}
    			}
    			document.location.assign(urls.full);
    		}
    	};

    	static render(app) {
    		if (app) {
    			this.setApp(app);
    		}
    		this.prepareData();
    		if (!this.menu) {
    			let target = document.querySelector(this.getOptions().targetSelector);
    			if(!target){return;}
    			this.menu = new Ui_side_menu({
    				target,
    				props: {
    					items: this.items,
    					sections: this.sections,
    					root: this.getOptions().root,
    					navigate: this.getOptions().navigate
    				}
    			});
    			this.initSizeResponse();
    			this.interval = setInterval(this.updateMenuActiveItem.bind(this), 200);
    			this.bindToggle();
    		}
    	}

    	static itemIsActive(itemURL) {
    		return ((this.location + '/').indexOf(itemURL + '/') > -1);
    	}

    	static updateMenu() {
    		Array.from(document.querySelectorAll(this.getOptions().targetSelector + ' a')).forEach((item) => {
    			if (this.itemIsActive(item.getAttribute('href'))) {
    				item.classList.add('is-active');
    			} else {
    				item.classList.remove('is-active');
    			}
    		});
    	}

    	static updateMenuActiveItem() {
    		let url = window.location.toString(),
    			lastLocation = this.location;
    		if (lastLocation) {
    			if (url !== lastLocation) {
    				this.location = url;
    				this.updateMenu();
    			}
    		} else {
    			this.location = url;
    			this.updateMenu();
    		}
    	}

    	static initSizeResponse() {
    		this.nav = document.querySelector('nav.navbar');
    		this.aside = document.querySelector('aside');
    		this.main = document.querySelector('main');
    		this.resizeAsideAndMain(this.aside, this.main, this.nav);
    		this.resizeMain(this.main, this.aside);
    		window.addEventListener('resize', this.resizeMain.bind(this));
    		if(this.getOptions().open){
    			this.show();
    		}else {
    			this.hide();
    		}
    	}

    	static resizeMain() {
    		if(this.isTouch()){
    			if(this.aside.classList.contains('is-active')){
    				this.main.style.display = 'none';
    			}else {
    				this.main.style.display = 'block';
    				this.main.style.marginLeft = '0px';
    			}
    		}else {
    			let rect = this.aside.getBoundingClientRect();
    			this.main.style.display = 'block';
    			if (this.main.style.height === '0px') {
    				this.main.style.height = 'auto';
    			}
    			this.main.style.marginLeft = (rect.width + rect.left) + 'px';
    		}
    	}

    	static resizeAside() {
    		if (this.aside.style.display !== 'none') {
    			let rect = this.nav.getBoundingClientRect();
    			this.aside.style.height = (window.innerHeight - rect.height) + 'px';
    			this.aside.style.marginTop = (rect.height) + 'px';
    		}
    	}

    	static resizeAsideAndMain() {
    		let rect = this.nav.getBoundingClientRect();
    		this.aside.style.height = (window.innerHeight - rect.height) + 'px';
    		//this.aside.style.paddingTop = (rect.height) + 'px';
    		this.main.style.marginTop = (rect.height) + 'px';
    	}

    	static bindToggle() {
    		let els = document.querySelectorAll(this.getOptions().toggleSelector);
    		Array.from(els).forEach((el) => {
    			el.removeEventListener('click', this.toggle.bind(this));
    			el.addEventListener('click', this.toggle.bind(this));
    		});
    	}

    	static toggle(e) {
    		e && e.preventDefault();
    		this.aside.classList.toggle('is-active');
    		this.resizeMain();
    		return false;
    	}

    	static hide(e) {
    		e && e.preventDefault();
    		this.aside.classList.remove('is-active');
    		this.resizeMain();
    		return false;
    	}

    	static show(e) {
    		e && e.preventDefault();
    		this.classList.add('is-active');
    		this.resizeMain();
    		return false;
    	}

    	static isOpen(){
    		if(this.aside){
    			return this.aside.classList.contains('is-active');
    		}else {
    			return true;
    		}
    	}
    }

    /* node_modules/not-bulma/src/ui.icon.svelte generated by Svelte v3.35.0 */

    function create_if_block_2$b(ctx) {
    	let figure;
    	let img;
    	let img_src_value;
    	let figure_class_value;

    	return {
    		c() {
    			figure = element("figure");
    			img = element("img");
    			if (img.src !== (img_src_value = /*src*/ ctx[4])) attr(img, "src", img_src_value);
    			attr(img, "title", /*title*/ ctx[0]);
    			attr(img, "alt", /*title*/ ctx[0]);
    			attr(img, "width", /*width*/ ctx[5]);
    			attr(img, "height", /*height*/ ctx[6]);

    			attr(figure, "class", figure_class_value = "image " + (/*width*/ ctx[5] && /*height*/ ctx[6]
    			? `is-${/*width*/ ctx[5]}x${/*height*/ ctx[6]}`
    			: "") + " ");
    		},
    		m(target, anchor) {
    			insert(target, figure, anchor);
    			append(figure, img);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*src*/ 16 && img.src !== (img_src_value = /*src*/ ctx[4])) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*title*/ 1) {
    				attr(img, "title", /*title*/ ctx[0]);
    			}

    			if (dirty & /*title*/ 1) {
    				attr(img, "alt", /*title*/ ctx[0]);
    			}

    			if (dirty & /*width*/ 32) {
    				attr(img, "width", /*width*/ ctx[5]);
    			}

    			if (dirty & /*height*/ 64) {
    				attr(img, "height", /*height*/ ctx[6]);
    			}

    			if (dirty & /*width, height*/ 96 && figure_class_value !== (figure_class_value = "image " + (/*width*/ ctx[5] && /*height*/ ctx[6]
    			? `is-${/*width*/ ctx[5]}x${/*height*/ ctx[6]}`
    			: "") + " ")) {
    				attr(figure, "class", figure_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(figure);
    		}
    	};
    }

    // (18:15) 
    function create_if_block_1$f(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			attr(span, "class", "icon");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			span.innerHTML = /*svg*/ ctx[3];
    		},
    		p(ctx, dirty) {
    			if (dirty & /*svg*/ 8) span.innerHTML = /*svg*/ ctx[3];		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (16:0) {#if font }
    function create_if_block$k(ctx) {
    	let uiiconfont;
    	let current;

    	uiiconfont = new Ui_icon_font({
    			props: {
    				font: /*font*/ ctx[2],
    				size: /*size*/ ctx[1],
    				title: /*title*/ ctx[0]
    			}
    		});

    	return {
    		c() {
    			create_component(uiiconfont.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiiconfont, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiiconfont_changes = {};
    			if (dirty & /*font*/ 4) uiiconfont_changes.font = /*font*/ ctx[2];
    			if (dirty & /*size*/ 2) uiiconfont_changes.size = /*size*/ ctx[1];
    			if (dirty & /*title*/ 1) uiiconfont_changes.title = /*title*/ ctx[0];
    			uiiconfont.$set(uiiconfont_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiiconfont.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiiconfont.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiiconfont, detaching);
    		}
    	};
    }

    function create_fragment$p(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$k, create_if_block_1$f, create_if_block_2$b];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*font*/ ctx[2]) return 0;
    		if (/*svg*/ ctx[3]) return 1;
    		if (/*src*/ ctx[4]) return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$p($$self, $$props, $$invalidate) {
    	let { title = "" } = $$props;
    	let { size = "" } = $$props;
    	let { font = "" } = $$props;
    	let { svg = "" } = $$props;
    	let { src = "" } = $$props;
    	let { width } = $$props;
    	let { height } = $$props;

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("size" in $$props) $$invalidate(1, size = $$props.size);
    		if ("font" in $$props) $$invalidate(2, font = $$props.font);
    		if ("svg" in $$props) $$invalidate(3, svg = $$props.svg);
    		if ("src" in $$props) $$invalidate(4, src = $$props.src);
    		if ("width" in $$props) $$invalidate(5, width = $$props.width);
    		if ("height" in $$props) $$invalidate(6, height = $$props.height);
    	};

    	return [title, size, font, svg, src, width, height];
    }

    class Ui_icon extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$p, create_fragment$p, safe_not_equal, {
    			title: 0,
    			size: 1,
    			font: 2,
    			svg: 3,
    			src: 4,
    			width: 5,
    			height: 6
    		});
    	}
    }

    /* node_modules/not-bulma/src/sidemenu/ui.burger.svelte generated by Svelte v3.35.0 */

    function create_else_block$h(ctx) {
    	let uiicon;
    	let current;
    	const uiicon_spread_levels = [/*iconOpen*/ ctx[0]];
    	let uiicon_props = {};

    	for (let i = 0; i < uiicon_spread_levels.length; i += 1) {
    		uiicon_props = assign(uiicon_props, uiicon_spread_levels[i]);
    	}

    	uiicon = new Ui_icon({ props: uiicon_props });

    	return {
    		c() {
    			create_component(uiicon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiicon, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiicon_changes = (dirty & /*iconOpen*/ 1)
    			? get_spread_update(uiicon_spread_levels, [get_spread_object(/*iconOpen*/ ctx[0])])
    			: {};

    			uiicon.$set(uiicon_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiicon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiicon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiicon, detaching);
    		}
    	};
    }

    // (40:2) {#if open }
    function create_if_block$j(ctx) {
    	let uiicon;
    	let current;
    	const uiicon_spread_levels = [/*iconClose*/ ctx[1]];
    	let uiicon_props = {};

    	for (let i = 0; i < uiicon_spread_levels.length; i += 1) {
    		uiicon_props = assign(uiicon_props, uiicon_spread_levels[i]);
    	}

    	uiicon = new Ui_icon({ props: uiicon_props });

    	return {
    		c() {
    			create_component(uiicon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiicon, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiicon_changes = (dirty & /*iconClose*/ 2)
    			? get_spread_update(uiicon_spread_levels, [get_spread_object(/*iconClose*/ ctx[1])])
    			: {};

    			uiicon.$set(uiicon_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiicon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiicon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uiicon, detaching);
    		}
    	};
    }

    function create_fragment$o(ctx) {
    	let a;
    	let current_block_type_index;
    	let if_block;
    	let a_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block$j, create_else_block$h];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*open*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			a = element("a");
    			if_block.c();
    			attr(a, "href", "");
    			attr(a, "class", a_class_value = "is-sidemenu-burger " + (/*open*/ ctx[2] ? "is-active" : ""));
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			if_blocks[current_block_type_index].m(a, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(a, "click", /*toggle*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(a, null);
    			}

    			if (!current || dirty & /*open*/ 4 && a_class_value !== (a_class_value = "is-sidemenu-burger " + (/*open*/ ctx[2] ? "is-active" : ""))) {
    				attr(a, "class", a_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let { iconOpen = {
    		src: "/img/icon/sidemenu/side_menu-i-32.png",
    		width: 32,
    		height: 32
    	} } = $$props;

    	let { iconClose = {
    		src: "/img/icon/sidemenu/side_menu-is-32.png",
    		width: 32,
    		height: 32
    	} } = $$props;

    	let open = true;

    	function toggle(e) {
    		e && e.preventDefault();
    		SideMenu.toggle();
    		updateState();
    		return false;
    	}

    	function updateState() {
    		$$invalidate(2, open = SideMenu.isOpen());
    	}

    	onMount(() => {
    		updateState();
    	});

    	$$self.$$set = $$props => {
    		if ("iconOpen" in $$props) $$invalidate(0, iconOpen = $$props.iconOpen);
    		if ("iconClose" in $$props) $$invalidate(1, iconClose = $$props.iconClose);
    	};

    	return [iconOpen, iconClose, open, toggle];
    }

    class Ui_burger extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, { iconOpen: 0, iconClose: 1 });
    	}
    }

    /* node_modules/not-bulma/src/ui.button.svelte generated by Svelte v3.35.0 */

    function create_else_block$g(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*title*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (40:2) {#if icon }
    function create_if_block$i(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let if_block0 = /*iconSide*/ ctx[14] === "left" && create_if_block_3$a(ctx);
    	let if_block1 = /*title*/ ctx[0] && create_if_block_2$a(ctx);
    	let if_block2 = /*iconSide*/ ctx[14] === "right" && create_if_block_1$e(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*iconSide*/ ctx[14] === "left") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3$a(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*title*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2$a(ctx);
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*iconSide*/ ctx[14] === "right") {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$e(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    		}
    	};
    }

    // (41:2) {#if iconSide === 'left' }
    function create_if_block_3$a(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[13] + " " + (/*size*/ ctx[11] ? `is-${/*size*/ ctx[11]}` : ""));
    			attr(span, "class", "icon");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon, size*/ 10240 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[13] + " " + (/*size*/ ctx[11] ? `is-${/*size*/ ctx[11]}` : ""))) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (44:2) {#if title }
    function create_if_block_2$a(ctx) {
    	let span;
    	let t;

    	return {
    		c() {
    			span = element("span");
    			t = text(/*title*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (47:2) {#if iconSide === 'right' }
    function create_if_block_1$e(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[13] + " " + (/*size*/ ctx[11] ? `is-${/*size*/ ctx[11]}` : ""));
    			attr(span, "class", "icon");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon, size*/ 10240 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[13] + " " + (/*size*/ ctx[11] ? `is-${/*size*/ ctx[11]}` : ""))) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    function create_fragment$n(ctx) {
    	let button;
    	let button_type_value;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*icon*/ ctx[13]) return create_if_block$i;
    		return create_else_block$g;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			button = element("button");
    			if_block.c();
    			button.disabled = /*disabled*/ ctx[7];
    			attr(button, "type", button_type_value = /*type*/ ctx[9] ? /*type*/ ctx[9] : "");
    			attr(button, "class", button_class_value = "\n    button\n    " + /*classes*/ ctx[12] + "\n    " + (/*state*/ ctx[8] ? `is-${/*state*/ ctx[8]}` : "") + "\n    " + (/*inverted*/ ctx[5] ? `is-inverted` : "") + "\n    " + (/*outlined*/ ctx[4] ? `is-outlined` : "") + "\n    " + (/*raised*/ ctx[3] ? `is-raised` : "") + "\n    " + (/*rounded*/ ctx[6] ? `is-rounded` : "") + "\n    " + (/*light*/ ctx[1] ? `is-light` : "") + "\n    " + (/*loading*/ ctx[2] ? `is-loading` : "") + "\n    " + (/*color*/ ctx[10] ? `is-${/*color*/ ctx[10]}` : "") + "\n    " + (/*size*/ ctx[11] ? `is-${/*size*/ ctx[11]}` : ""));
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			if_block.m(button, null);

    			if (!mounted) {
    				dispose = listen(button, "click", function () {
    					if (is_function(/*action*/ ctx[15])) /*action*/ ctx[15].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(button, null);
    				}
    			}

    			if (dirty & /*disabled*/ 128) {
    				button.disabled = /*disabled*/ ctx[7];
    			}

    			if (dirty & /*type*/ 512 && button_type_value !== (button_type_value = /*type*/ ctx[9] ? /*type*/ ctx[9] : "")) {
    				attr(button, "type", button_type_value);
    			}

    			if (dirty & /*classes, state, inverted, outlined, raised, rounded, light, loading, color, size*/ 7550 && button_class_value !== (button_class_value = "\n    button\n    " + /*classes*/ ctx[12] + "\n    " + (/*state*/ ctx[8] ? `is-${/*state*/ ctx[8]}` : "") + "\n    " + (/*inverted*/ ctx[5] ? `is-inverted` : "") + "\n    " + (/*outlined*/ ctx[4] ? `is-outlined` : "") + "\n    " + (/*raised*/ ctx[3] ? `is-raised` : "") + "\n    " + (/*rounded*/ ctx[6] ? `is-rounded` : "") + "\n    " + (/*light*/ ctx[1] ? `is-light` : "") + "\n    " + (/*loading*/ ctx[2] ? `is-loading` : "") + "\n    " + (/*color*/ ctx[10] ? `is-${/*color*/ ctx[10]}` : "") + "\n    " + (/*size*/ ctx[11] ? `is-${/*size*/ ctx[11]}` : ""))) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let { title = "" } = $$props;
    	let { light = false } = $$props;
    	let { loading = false } = $$props;
    	let { raised = false } = $$props;
    	let { outlined = false } = $$props;
    	let { inverted = false } = $$props;
    	let { rounded = false } = $$props;
    	let { disabled = false } = $$props;
    	let { state = "" } = $$props;
    	let { type = "" } = $$props;
    	let { color = "" } = $$props;
    	let { size = "" } = $$props;
    	let { classes = "" } = $$props;
    	let { icon = false } = $$props;
    	let { iconSide = "right" } = $$props;

    	let { action = () => {
    		return true;
    	} } = $$props;

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("light" in $$props) $$invalidate(1, light = $$props.light);
    		if ("loading" in $$props) $$invalidate(2, loading = $$props.loading);
    		if ("raised" in $$props) $$invalidate(3, raised = $$props.raised);
    		if ("outlined" in $$props) $$invalidate(4, outlined = $$props.outlined);
    		if ("inverted" in $$props) $$invalidate(5, inverted = $$props.inverted);
    		if ("rounded" in $$props) $$invalidate(6, rounded = $$props.rounded);
    		if ("disabled" in $$props) $$invalidate(7, disabled = $$props.disabled);
    		if ("state" in $$props) $$invalidate(8, state = $$props.state);
    		if ("type" in $$props) $$invalidate(9, type = $$props.type);
    		if ("color" in $$props) $$invalidate(10, color = $$props.color);
    		if ("size" in $$props) $$invalidate(11, size = $$props.size);
    		if ("classes" in $$props) $$invalidate(12, classes = $$props.classes);
    		if ("icon" in $$props) $$invalidate(13, icon = $$props.icon);
    		if ("iconSide" in $$props) $$invalidate(14, iconSide = $$props.iconSide);
    		if ("action" in $$props) $$invalidate(15, action = $$props.action);
    	};

    	return [
    		title,
    		light,
    		loading,
    		raised,
    		outlined,
    		inverted,
    		rounded,
    		disabled,
    		state,
    		type,
    		color,
    		size,
    		classes,
    		icon,
    		iconSide,
    		action
    	];
    }

    class Ui_button extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {
    			title: 0,
    			light: 1,
    			loading: 2,
    			raised: 3,
    			outlined: 4,
    			inverted: 5,
    			rounded: 6,
    			disabled: 7,
    			state: 8,
    			type: 9,
    			color: 10,
    			size: 11,
    			classes: 12,
    			icon: 13,
    			iconSide: 14,
    			action: 15
    		});
    	}
    }

    class UICommon {
    	static DEFAULT_REDIRECT_TIMEOUT = 3000;
    	static CLASS_OK = 'is-success';
    	static CLASS_ERR = 'is-danger';
    	static FILLER = '_';

    	/**
    	 *	Reformats input from any string to strict phone format
    	 *	@param {string}		phone		free style phone number
    	 *	@returns {string}					phone number
    	 **/
    	static formatPhone(val, filler = this.FILLER) {
    		//starting from 11 digits in phone number
    		const slots = [1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5];
    		let digits = val.replace(/\D/g, '');
    		//if there are more, move them to country code slot
    		if (digits.length > 11) {
    			let d = digits.length - 11;
    			while (d > 0) {
    				d--;
    				slots.unshift(1);
    			}
    		}
    		let stack = ['', '', '', '', ''];
    		Array.from(digits).forEach((digit, index) => {
    			let slot = slots[index];
    			stack[slot - 1] = (stack[slot - 1] + digit);
    		});
    		//creating map of parts lengths
    		const lens = slots.reduce((acc, curr) => {
    			if (typeof acc[curr] === 'undefined') {
    				acc[curr] = 1;
    			} else {
    				acc[curr] += 1;
    			}
    			return acc;
    		}, {});
    		//fill empty positions with filler (_)
    		for (let t in stack) {
    			let dif = lens[parseInt(t) + 1] - stack[t].length;
    			while (dif > 0) {
    				stack[t] = (stack[t] + filler);
    				dif--;
    			}
    		}
    		return `+${stack[0]} (${stack[1]}) ${stack[2]}-${stack[3]}-${stack[4]}`;
    	}

    	static MONEY_SIGN = '&#8381;';

    	static setMoneySign(val) {
    		this.MONEY_SIGN = val;
    	}

    	static formatPrice(price) {
    		let major = parseInt(Math.floor(price / 100)),
    			minor = parseInt(price % 100);
    		major = '' + major;
    		return `${this.MONEY_SIGN}${major}.${minor}`;
    	}

    	static formatTimestamp(timestamp, offset = 0) {
    		let offsetLocal = new Date().getTimezoneOffset();
    		let deltaOffset = (offsetLocal - parseInt(offset)) * 60 * 1000;
    		let localDateTime = new Date(parseInt(timestamp) - deltaOffset);
    		return localDateTime.toLocaleString(window.navigator.language);
    	}

    	static TIME = {
    		SECONDS: ['секунду', 'секунды', 'секунд'],
    		MINUTES: ['минуту', 'минуты', 'минут'],
    		HOURS: ['час', 'часа', 'часов']
    	};

    	static declOfNum(n, text_forms) {
    		n = Math.abs(n) % 100;
    		let n1 = n % 10;
    		if (n > 10 && n < 20) {
    			return text_forms[2];
    		}
    		if (n1 > 1 && n1 < 5) {
    			return text_forms[1];
    		}
    		if (n1 == 1) {
    			return text_forms[0];
    		}
    		return text_forms[2];
    	}

    	static humanizedTimeDiff(date /* unix time */) {
        let currentTime = new Date().getTime();
        let sec = Math.round((currentTime - date) / 1000);
        let unit;
        if (sec < 60) {
          unit = this.declOfNum(sec, this.TIME.SECONDS);
          return `${sec} ${unit} назад`;
        } else if (sec < 3600) {
          let min = Math.floor(sec / 60);
          unit = this.declOfNum(min, this.TIME.MINUTES);
          return `${min} ${unit} назад`;
        } else {
          let hours = Math.floor(sec / (60 * 60));
          unit = this.declOfNum(hours, this.TIME.HOURS);
          return `${hours} ${unit} назад`;
        }
      }

    }

    /* node_modules/not-bulma/src/form/ui.label.svelte generated by Svelte v3.35.0 */

    function create_fragment$m(ctx) {
    	let label_1;
    	let t;

    	return {
    		c() {
    			label_1 = element("label");
    			t = text(/*label*/ ctx[1]);
    			attr(label_1, "class", "label");
    			attr(label_1, "for", /*id*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, label_1, anchor);
    			append(label_1, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*label*/ 2) set_data(t, /*label*/ ctx[1]);

    			if (dirty & /*id*/ 1) {
    				attr(label_1, "for", /*id*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(label_1);
    		}
    	};
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let { id } = $$props;
    	let { label = "label" } = $$props;

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    	};

    	return [id, label];
    }

    class Ui_label extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, { id: 0, label: 1 });
    	}
    }

    /* node_modules/not-bulma/src/form/ui.textfield.svelte generated by Svelte v3.35.0 */

    function create_if_block_4$9(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[4]);
    			attr(span, "class", "icon is-small is-left");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon*/ 16 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[4])) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (59:4) {#if validated === true }
    function create_if_block_1$d(ctx) {
    	let span;

    	function select_block_type(ctx, dirty) {
    		if (/*valid*/ ctx[7] === true) return create_if_block_2$9;
    		if (/*valid*/ ctx[7] === false) return create_if_block_3$9;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr(span, "class", "icon is-small is-right");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};
    }

    // (63:35) 
    function create_if_block_3$9(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-exclamation-triangle");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (61:6) {#if valid === true }
    function create_if_block_2$9(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-check");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (72:4) {:else}
    function create_else_block$f(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (70:4) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$h(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 1024) set_data(t, /*helper*/ ctx[10]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$l(ctx) {
    	let div;
    	let input;
    	let input_id_value;
    	let input_class_value;
    	let input_aria_controls_value;
    	let input_aria_describedby_value;
    	let t0;
    	let t1;
    	let div_class_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let p_id_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*icon*/ ctx[4] && create_if_block_4$9(ctx);
    	let if_block1 = /*validated*/ ctx[8] === true && create_if_block_1$d(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!(/*validated*/ ctx[8] && /*valid*/ ctx[7]) && /*inputStarted*/ ctx[0]) return create_if_block$h;
    		return create_else_block$f;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block2 = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			p = element("p");
    			if_block2.c();
    			attr(input, "id", input_id_value = "form-field-textfield-" + /*fieldname*/ ctx[3]);
    			attr(input, "class", input_class_value = "input " + /*validationClasses*/ ctx[12]);
    			attr(input, "type", "text");
    			attr(input, "name", /*fieldname*/ ctx[3]);
    			attr(input, "invalid", /*invalid*/ ctx[11]);
    			input.required = /*required*/ ctx[5];
    			attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			attr(input, "aria-controls", input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(input, "aria-describedby", input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			input.readOnly = /*readonly*/ ctx[6];
    			attr(div, "class", div_class_value = "control " + /*iconClasses*/ ctx[9]);
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[12]);
    			attr(p, "id", p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			set_input_value(input, /*value*/ ctx[1]);
    			append(div, t0);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			if_block2.m(p, null);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[19]),
    					listen(input, "change", /*onBlur*/ ctx[13]),
    					listen(input, "input", /*onInput*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*fieldname*/ 8 && input_id_value !== (input_id_value = "form-field-textfield-" + /*fieldname*/ ctx[3])) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*validationClasses*/ 4096 && input_class_value !== (input_class_value = "input " + /*validationClasses*/ ctx[12])) {
    				attr(input, "class", input_class_value);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "name", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*invalid*/ 2048) {
    				attr(input, "invalid", /*invalid*/ ctx[11]);
    			}

    			if (dirty & /*required*/ 32) {
    				input.required = /*required*/ ctx[5];
    			}

    			if (dirty & /*placeholder*/ 4) {
    				attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_controls_value !== (input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-controls", input_aria_controls_value);
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_describedby_value !== (input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-describedby", input_aria_describedby_value);
    			}

    			if (dirty & /*readonly*/ 64) {
    				input.readOnly = /*readonly*/ ctx[6];
    			}

    			if (dirty & /*value*/ 2 && input.value !== /*value*/ ctx[1]) {
    				set_input_value(input, /*value*/ ctx[1]);
    			}

    			if (/*icon*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$9(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*validated*/ ctx[8] === true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$d(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*iconClasses*/ 512 && div_class_value !== (div_class_value = "control " + /*iconClasses*/ ctx[9])) {
    				attr(div, "class", div_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 4096 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[12])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 8 && p_id_value !== (p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    			if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let iconClasses;
    	let allErrors;
    	let helper;
    	let invalid;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = "" } = $$props;
    	let { placeholder = "input some text here, please" } = $$props;
    	let { fieldname = "textfield" } = $$props;
    	let { icon = false } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		let data = { field: fieldname, value };
    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function onInput(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(3, fieldname = $$props.fieldname);
    		if ("icon" in $$props) $$invalidate(4, icon = $$props.icon);
    		if ("required" in $$props) $$invalidate(5, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(6, readonly = $$props.readonly);
    		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(8, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(15, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(16, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(17, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 16) {
    			$$invalidate(9, iconClasses = (icon ? " has-icons-left " : "") + " has-icons-right ");
    		}

    		if ($$self.$$.dirty & /*errors, formErrors*/ 98304) {
    			$$invalidate(18, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 262148) {
    			$$invalidate(10, helper = allErrors
    			? allErrors.join(", ")
    			: multi ? placeholder[activeSubKey] : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 131200) {
    			$$invalidate(11, invalid = valid === false || formLevelError);
    		}

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 129) {
    			$$invalidate(12, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		placeholder,
    		fieldname,
    		icon,
    		required,
    		readonly,
    		valid,
    		validated,
    		iconClasses,
    		helper,
    		invalid,
    		validationClasses,
    		onBlur,
    		onInput,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		input_input_handler
    	];
    }

    class Ui_textfield extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			placeholder: 2,
    			fieldname: 3,
    			icon: 4,
    			required: 5,
    			readonly: 6,
    			valid: 7,
    			validated: 8,
    			errors: 15,
    			formErrors: 16,
    			formLevelError: 17
    		});
    	}
    }

    /* node_modules/simple-svelte-autocomplete/src/SimpleAutocomplete.svelte generated by Svelte v3.35.0 */

    function get_each_context$7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[71] = list[i];
    	child_ctx[73] = i;
    	return child_ctx;
    }

    // (736:2) {#if showClear}
    function create_if_block_6$2(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "✖";
    			attr(span, "class", "autocomplete-clear-button svelte-17gke0z");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (!mounted) {
    				dispose = listen(span, "click", /*clear*/ ctx[26]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (765:28) 
    function create_if_block_5$2(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*noResultsText*/ ctx[1]);
    			attr(div, "class", "autocomplete-list-item-no-results svelte-17gke0z");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*noResultsText*/ 2) set_data(t, /*noResultsText*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (743:4) {#if filteredListItems && filteredListItems.length > 0}
    function create_if_block$g(ctx) {
    	let t;
    	let if_block_anchor;
    	let each_value = /*filteredListItems*/ ctx[16];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$7(get_each_context$7(ctx, each_value, i));
    	}

    	let if_block = /*maxItemsToShowInList*/ ctx[0] > 0 && /*filteredListItems*/ ctx[16].length > /*maxItemsToShowInList*/ ctx[0] && create_if_block_1$c(ctx);

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*highlightIndex, onListItemClick, filteredListItems, maxItemsToShowInList*/ 622593) {
    				each_value = /*filteredListItems*/ ctx[16];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$7(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$7(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*maxItemsToShowInList*/ ctx[0] > 0 && /*filteredListItems*/ ctx[16].length > /*maxItemsToShowInList*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$c(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (745:8) {#if listItem && (maxItemsToShowInList <= 0 || i < maxItemsToShowInList)}
    function create_if_block_2$8(ctx) {
    	let if_block_anchor;
    	let if_block = /*listItem*/ ctx[71] && create_if_block_3$8(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*listItem*/ ctx[71]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3$8(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (746:10) {#if listItem}
    function create_if_block_3$8(ctx) {
    	let div;
    	let div_class_value;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*listItem*/ ctx[71].highlighted) return create_if_block_4$8;
    		return create_else_block$e;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler() {
    		return /*click_handler*/ ctx[48](/*listItem*/ ctx[71]);
    	}

    	return {
    		c() {
    			div = element("div");
    			if_block.c();

    			attr(div, "class", div_class_value = "autocomplete-list-item " + (/*i*/ ctx[73] === /*highlightIndex*/ ctx[15]
    			? "selected"
    			: "") + " svelte-17gke0z");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if_block.m(div, null);

    			if (!mounted) {
    				dispose = listen(div, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}

    			if (dirty[0] & /*highlightIndex*/ 32768 && div_class_value !== (div_class_value = "autocomplete-list-item " + (/*i*/ ctx[73] === /*highlightIndex*/ ctx[15]
    			? "selected"
    			: "") + " svelte-17gke0z")) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (752:14) {:else}
    function create_else_block$e(ctx) {
    	let html_tag;
    	let raw_value = /*listItem*/ ctx[71].label + "";
    	let html_anchor;

    	return {
    		c() {
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
    		},
    		m(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*filteredListItems*/ 65536 && raw_value !== (raw_value = /*listItem*/ ctx[71].label + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    // (750:14) {#if listItem.highlighted}
    function create_if_block_4$8(ctx) {
    	let html_tag;
    	let raw_value = /*listItem*/ ctx[71].highlighted.label + "";
    	let html_anchor;

    	return {
    		c() {
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
    		},
    		m(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*filteredListItems*/ 65536 && raw_value !== (raw_value = /*listItem*/ ctx[71].highlighted.label + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    // (744:6) {#each filteredListItems as listItem, i}
    function create_each_block$7(ctx) {
    	let if_block_anchor;
    	let if_block = /*listItem*/ ctx[71] && (/*maxItemsToShowInList*/ ctx[0] <= 0 || /*i*/ ctx[73] < /*maxItemsToShowInList*/ ctx[0]) && create_if_block_2$8(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*listItem*/ ctx[71] && (/*maxItemsToShowInList*/ ctx[0] <= 0 || /*i*/ ctx[73] < /*maxItemsToShowInList*/ ctx[0])) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$8(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (760:6) {#if maxItemsToShowInList > 0 && filteredListItems.length > maxItemsToShowInList}
    function create_if_block_1$c(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*filteredListItems*/ ctx[16].length - /*maxItemsToShowInList*/ ctx[0] + "";
    	let t1;
    	let t2;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("...");
    			t1 = text(t1_value);
    			t2 = text(" results not shown");
    			attr(div, "class", "autocomplete-list-item-no-results svelte-17gke0z");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*filteredListItems, maxItemsToShowInList*/ 65537 && t1_value !== (t1_value = /*filteredListItems*/ ctx[16].length - /*maxItemsToShowInList*/ ctx[0] + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$k(ctx) {
    	let div1;
    	let input_1;
    	let input_1_class_value;
    	let input_1_id_value;
    	let t0;
    	let t1;
    	let div0;
    	let div0_class_value;
    	let div1_class_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*showClear*/ ctx[9] && create_if_block_6$2(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*filteredListItems*/ ctx[16] && /*filteredListItems*/ ctx[16].length > 0) return create_if_block$g;
    		if (/*noResultsText*/ ctx[1]) return create_if_block_5$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			input_1 = element("input");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div0 = element("div");
    			if (if_block1) if_block1.c();
    			attr(input_1, "type", "text");

    			attr(input_1, "class", input_1_class_value = "" + ((/*inputClassName*/ ctx[4]
    			? /*inputClassName*/ ctx[4]
    			: "") + " input autocomplete-input" + " svelte-17gke0z"));

    			attr(input_1, "id", input_1_id_value = /*inputId*/ ctx[5] ? /*inputId*/ ctx[5] : "");
    			attr(input_1, "placeholder", /*placeholder*/ ctx[2]);
    			attr(input_1, "name", /*name*/ ctx[6]);
    			input_1.disabled = /*disabled*/ ctx[10];
    			attr(input_1, "title", /*title*/ ctx[11]);

    			attr(div0, "class", div0_class_value = "" + ((/*dropdownClassName*/ ctx[7]
    			? /*dropdownClassName*/ ctx[7]
    			: "") + " autocomplete-list " + (/*showList*/ ctx[17] ? "" : "hidden") + "\n    is-fullwidth" + " svelte-17gke0z"));

    			attr(div1, "class", div1_class_value = "" + ((/*className*/ ctx[3] ? /*className*/ ctx[3] : "") + "\n  " + (/*hideArrow*/ ctx[8] ? "hide-arrow is-multiple" : "") + "\n  " + (/*showClear*/ ctx[9] ? "show-clear" : "") + " autocomplete select is-fullwidth " + /*uniqueId*/ ctx[18] + " svelte-17gke0z"));
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, input_1);
    			/*input_1_binding*/ ctx[46](input_1);
    			set_input_value(input_1, /*text*/ ctx[12]);
    			append(div1, t0);
    			if (if_block0) if_block0.m(div1, null);
    			append(div1, t1);
    			append(div1, div0);
    			if (if_block1) if_block1.m(div0, null);
    			/*div0_binding*/ ctx[49](div0);

    			if (!mounted) {
    				dispose = [
    					listen(window, "click", /*onDocumentClick*/ ctx[20]),
    					listen(input_1, "input", /*input_1_input_handler*/ ctx[47]),
    					listen(input_1, "input", /*onInput*/ ctx[23]),
    					listen(input_1, "focus", /*onFocus*/ ctx[25]),
    					listen(input_1, "keydown", /*onKeyDown*/ ctx[21]),
    					listen(input_1, "click", /*onInputClick*/ ctx[24]),
    					listen(input_1, "keypress", /*onKeyPress*/ ctx[22])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*inputClassName*/ 16 && input_1_class_value !== (input_1_class_value = "" + ((/*inputClassName*/ ctx[4]
    			? /*inputClassName*/ ctx[4]
    			: "") + " input autocomplete-input" + " svelte-17gke0z"))) {
    				attr(input_1, "class", input_1_class_value);
    			}

    			if (dirty[0] & /*inputId*/ 32 && input_1_id_value !== (input_1_id_value = /*inputId*/ ctx[5] ? /*inputId*/ ctx[5] : "")) {
    				attr(input_1, "id", input_1_id_value);
    			}

    			if (dirty[0] & /*placeholder*/ 4) {
    				attr(input_1, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty[0] & /*name*/ 64) {
    				attr(input_1, "name", /*name*/ ctx[6]);
    			}

    			if (dirty[0] & /*disabled*/ 1024) {
    				input_1.disabled = /*disabled*/ ctx[10];
    			}

    			if (dirty[0] & /*title*/ 2048) {
    				attr(input_1, "title", /*title*/ ctx[11]);
    			}

    			if (dirty[0] & /*text*/ 4096 && input_1.value !== /*text*/ ctx[12]) {
    				set_input_value(input_1, /*text*/ ctx[12]);
    			}

    			if (/*showClear*/ ctx[9]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_6$2(ctx);
    					if_block0.c();
    					if_block0.m(div1, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if (if_block1) if_block1.d(1);
    				if_block1 = current_block_type && current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			}

    			if (dirty[0] & /*dropdownClassName, showList*/ 131200 && div0_class_value !== (div0_class_value = "" + ((/*dropdownClassName*/ ctx[7]
    			? /*dropdownClassName*/ ctx[7]
    			: "") + " autocomplete-list " + (/*showList*/ ctx[17] ? "" : "hidden") + "\n    is-fullwidth" + " svelte-17gke0z"))) {
    				attr(div0, "class", div0_class_value);
    			}

    			if (dirty[0] & /*className, hideArrow, showClear*/ 776 && div1_class_value !== (div1_class_value = "" + ((/*className*/ ctx[3] ? /*className*/ ctx[3] : "") + "\n  " + (/*hideArrow*/ ctx[8] ? "hide-arrow is-multiple" : "") + "\n  " + (/*showClear*/ ctx[9] ? "show-clear" : "") + " autocomplete select is-fullwidth " + /*uniqueId*/ ctx[18] + " svelte-17gke0z"))) {
    				attr(div1, "class", div1_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			/*input_1_binding*/ ctx[46](null);
    			if (if_block0) if_block0.d();

    			if (if_block1) {
    				if_block1.d();
    			}

    			/*div0_binding*/ ctx[49](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function safeStringFunction(theFunction, argument) {
    	if (typeof theFunction !== "function") {
    		console.error("Not a function: " + theFunction + ", argument: " + argument);
    	}

    	let originalResult;

    	try {
    		originalResult = theFunction(argument);
    	} catch(error) {
    		console.warn("Error executing Autocomplete function on value: " + argument + " function: " + theFunction);
    	}

    	let result = originalResult;

    	if (result === undefined || result === null) {
    		result = "";
    	}

    	if (typeof result !== "string") {
    		result = result.toString();
    	}

    	return result;
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let showList;
    	let { items = [] } = $$props;
    	let { labelFieldName = undefined } = $$props;
    	let { keywordsFieldName = labelFieldName } = $$props;
    	let { valueFieldName = undefined } = $$props;

    	let { labelFunction = function (item) {
    		if (item === undefined || item === null) {
    			return "";
    		}

    		return labelFieldName ? item[labelFieldName] : item;
    	} } = $$props;

    	let { keywordsFunction = function (item) {
    		if (item === undefined || item === null) {
    			return "";
    		}

    		return keywordsFieldName
    		? item[keywordsFieldName]
    		: labelFunction(item);
    	} } = $$props;

    	let { valueFunction = function (item) {
    		if (item === undefined || item === null) {
    			return item;
    		}

    		return valueFieldName ? item[valueFieldName] : item;
    	} } = $$props;

    	let { keywordsCleanFunction = function (keywords) {
    		return keywords;
    	} } = $$props;

    	let { textCleanFunction = function (userEnteredText) {
    		return userEnteredText;
    	} } = $$props;

    	let { searchFunction = false } = $$props;

    	let { beforeChange = function (oldSelectedItem, newSelectedItem) {
    		return true;
    	} } = $$props;

    	let { onChange = function (newSelectedItem) {
    		
    	} } = $$props;

    	let { selectFirstIfEmpty = false } = $$props;
    	let { minCharactersToSearch = 1 } = $$props;
    	let { maxItemsToShowInList = 0 } = $$props;
    	let { noResultsText = "No results found" } = $$props;
    	const uniqueId = "sautocomplete-" + Math.floor(Math.random() * 1000);

    	function safeLabelFunction(item) {
    		// console.log("labelFunction: " + labelFunction);
    		// console.log("safeLabelFunction, item: " + item);
    		return safeStringFunction(labelFunction, item);
    	}

    	function safeKeywordsFunction(item) {
    		// console.log("safeKeywordsFunction");
    		const keywords = safeStringFunction(keywordsFunction, item);

    		let result = safeStringFunction(keywordsCleanFunction, keywords);
    		result = result.toLowerCase().trim();

    		if (debug) {
    			console.log("Extracted keywords: '" + result + "' from item: " + JSON.stringify(item));
    		}

    		return result;
    	}

    	let { placeholder = undefined } = $$props;
    	let { className = undefined } = $$props;
    	let { inputClassName = undefined } = $$props;
    	let { inputId = undefined } = $$props;
    	let { name = undefined } = $$props;
    	let { dropdownClassName = undefined } = $$props;
    	let { hideArrow = false } = $$props;
    	let { showClear = false } = $$props;
    	let { disabled = false } = $$props;
    	let { title = undefined } = $$props;
    	let { debug = false } = $$props;
    	let { selectedItem = undefined } = $$props;
    	let { value = undefined } = $$props;
    	let text;
    	let filteredTextLength = 0;

    	function onSelectedItemChanged() {
    		$$invalidate(29, value = valueFunction(selectedItem));
    		$$invalidate(12, text = safeLabelFunction(selectedItem));
    		onChange(selectedItem);
    	}

    	// HTML elements
    	let input;

    	let list;

    	// UI state
    	let opened = false;

    	let highlightIndex = -1;

    	// view model
    	let filteredListItems;

    	let listItems = [];

    	function prepareListItems() {
    		let tStart;

    		if (debug) {
    			tStart = performance.now();
    			console.log("prepare items to search");
    			console.log("items: " + JSON.stringify(items));
    		}

    		if (!Array.isArray(items)) {
    			console.warn("Autocomplete items / search function did not return array but", items);
    			$$invalidate(27, items = []);
    		}

    		const length = items ? items.length : 0;
    		listItems = new Array(length);

    		if (length > 0) {
    			items.forEach((item, i) => {
    				const listItem = getListItem(item);

    				if (listItem == undefined) {
    					console.log("Undefined item for: ", item);
    				}

    				listItems[i] = listItem;
    			});
    		}

    		if (debug) {
    			const tEnd = performance.now();
    			console.log(listItems.length + " items to search prepared in " + (tEnd - tStart) + " milliseconds");
    		}
    	}

    	function getListItem(item) {
    		return {
    			// keywords representation of the item
    			keywords: safeKeywordsFunction(item),
    			// item label
    			label: safeLabelFunction(item),
    			// store reference to the origial item
    			item
    		};
    	}

    	function prepareUserEnteredText(userEnteredText) {
    		if (userEnteredText === undefined || userEnteredText === null) {
    			return "";
    		}

    		const textFiltered = userEnteredText.replace(/[&/\\#,+()$~%.'":*?<>{}]/g, " ").trim();
    		$$invalidate(44, filteredTextLength = textFiltered.length);

    		if (minCharactersToSearch > 1) {
    			if (filteredTextLength < minCharactersToSearch) {
    				return "";
    			}
    		}

    		const cleanUserEnteredText = textCleanFunction(textFiltered);
    		const textFilteredLowerCase = cleanUserEnteredText.toLowerCase().trim();

    		if (debug) {
    			console.log("Change user entered text '" + userEnteredText + "' into '" + textFilteredLowerCase + "'");
    		}

    		return textFilteredLowerCase;
    	}

    	async function search() {
    		let tStart;

    		if (debug) {
    			tStart = performance.now();
    			console.log("Searching user entered text: '" + text + "'");
    		}

    		const textFiltered = prepareUserEnteredText(text);

    		if (textFiltered === "") {
    			$$invalidate(16, filteredListItems = listItems);
    			closeIfMinCharsToSearchReached();

    			if (debug) {
    				console.log("User entered text is empty set the list of items to all items");
    			}

    			return;
    		}

    		if (searchFunction) {
    			$$invalidate(27, items = await searchFunction(textFiltered));
    			prepareListItems();
    		}

    		const searchWords = textFiltered.split(" ");

    		let tempfilteredListItems = listItems.filter(listItem => {
    			if (!listItem) {
    				return false;
    			}

    			const itemKeywords = listItem.keywords;
    			let matches = 0;

    			searchWords.forEach(searchWord => {
    				if (itemKeywords.includes(searchWord)) {
    					matches++;
    				}
    			});

    			return matches >= searchWords.length;
    		});

    		const hlfilter = highlightFilter(textFiltered, ["label"]);
    		const filteredListItemsHighlighted = tempfilteredListItems.map(hlfilter);
    		$$invalidate(16, filteredListItems = filteredListItemsHighlighted);
    		closeIfMinCharsToSearchReached();

    		if (debug) {
    			const tEnd = performance.now();
    			console.log("Search took " + (tEnd - tStart) + " milliseconds, found " + filteredListItems.length + " items");
    		}
    	}

    	// $: text, search();
    	function selectListItem(listItem) {
    		if (debug) {
    			console.log("selectListItem");
    		}

    		if ("undefined" === typeof listItem) {
    			if (debug) {
    				console.log(`listItem ${i} is undefined. Can not select.`);
    			}

    			return false;
    		}

    		const newSelectedItem = listItem.item;

    		if (beforeChange(selectedItem, newSelectedItem)) {
    			$$invalidate(28, selectedItem = newSelectedItem);
    		}

    		return true;
    	}

    	function selectItem() {
    		if (debug) {
    			console.log("selectItem");
    		}

    		const listItem = filteredListItems[highlightIndex];

    		if (selectListItem(listItem)) {
    			close();
    		}
    	}

    	function up() {
    		if (debug) {
    			console.log("up");
    		}

    		open();
    		if (highlightIndex > 0) $$invalidate(15, highlightIndex--, highlightIndex);
    		highlight();
    	}

    	function down() {
    		if (debug) {
    			console.log("down");
    		}

    		open();
    		if (highlightIndex < filteredListItems.length - 1) $$invalidate(15, highlightIndex++, highlightIndex);
    		highlight();
    	}

    	function highlight() {
    		if (debug) {
    			console.log("highlight");
    		}

    		const query = ".selected";

    		if (debug) {
    			console.log("Seaching DOM element: " + query + " in " + list);
    		}

    		const el = list.querySelector(query);

    		if (el) {
    			if (typeof el.scrollIntoViewIfNeeded === "function") {
    				if (debug) {
    					console.log("Scrolling selected item into view");
    				}

    				el.scrollIntoViewIfNeeded();
    			} else {
    				if (debug) {
    					console.warn("Could not scroll selected item into view, scrollIntoViewIfNeeded not supported");
    				}
    			}
    		} else {
    			if (debug) {
    				console.warn("Selected item not found to scroll into view");
    			}
    		}
    	}

    	function onListItemClick(listItem) {
    		if (debug) {
    			console.log("onListItemClick");
    		}

    		if (selectListItem(listItem)) {
    			close();
    		}
    	}

    	function onDocumentClick(e) {
    		if (debug) {
    			console.log("onDocumentClick: " + JSON.stringify(e.target));
    		}

    		if (e.target.closest("." + uniqueId)) {
    			if (debug) {
    				console.log("onDocumentClick inside");
    			}

    			// resetListToAllItemsAndOpen();
    			highlight();
    		} else {
    			if (debug) {
    				console.log("onDocumentClick outside");
    			}

    			close();
    		}
    	}

    	function onKeyDown(e) {
    		if (debug) {
    			console.log("onKeyDown");
    		}

    		let key = e.key;
    		if (key === "Tab" && e.shiftKey) key = "ShiftTab";

    		const fnmap = {
    			Tab: opened ? down.bind(this) : null,
    			ShiftTab: opened ? up.bind(this) : null,
    			ArrowDown: down.bind(this),
    			ArrowUp: up.bind(this),
    			Escape: onEsc.bind(this)
    		};

    		const fn = fnmap[key];

    		if (typeof fn === "function") {
    			e.preventDefault();
    			fn(e);
    		}
    	}

    	function onKeyPress(e) {
    		if (debug) {
    			console.log("onKeyPress");
    		}

    		if (e.key === "Enter") {
    			e.preventDefault();
    			selectItem();
    		}
    	}

    	function onInput(e) {
    		if (debug) {
    			console.log("onInput");
    		}

    		$$invalidate(12, text = e.target.value);
    		search();
    		$$invalidate(15, highlightIndex = 0);
    		open();
    	}

    	function onInputClick() {
    		if (debug) {
    			console.log("onInputClick");
    		}

    		resetListToAllItemsAndOpen();
    	}

    	function onEsc(e) {
    		if (debug) {
    			console.log("onEsc");
    		}

    		//if (text) return clear();
    		e.stopPropagation();

    		if (opened) {
    			input.focus();
    			close();
    		}
    	}

    	function onFocus() {
    		if (debug) {
    			console.log("onFocus");
    		}

    		resetListToAllItemsAndOpen();
    	}

    	function resetListToAllItemsAndOpen() {
    		if (debug) {
    			console.log("resetListToAllItemsAndOpen");
    		}

    		$$invalidate(16, filteredListItems = listItems);
    		open();

    		// find selected item
    		if (selectedItem) {
    			if (debug) {
    				console.log("Searching currently selected item: " + JSON.stringify(selectedItem));
    			}

    			for (let i = 0; i < listItems.length; i++) {
    				const listItem = listItems[i];

    				if ("undefined" === typeof listItem) {
    					if (debug) {
    						console.log(`listItem ${i} is undefined. Skipping.`);
    					}

    					continue;
    				}

    				if (debug) {
    					console.log("Item " + i + ": " + JSON.stringify(listItem));
    				}

    				if (selectedItem == listItem.item) {
    					$$invalidate(15, highlightIndex = i);

    					if (debug) {
    						console.log("Found selected item: " + i + ": " + JSON.stringify(listItem));
    					}

    					highlight();
    					break;
    				}
    			}
    		}
    	}

    	function open() {
    		if (debug) {
    			console.log("open");
    		}

    		// check if the search text has more than the min chars required
    		if (isMinCharsToSearchReached()) {
    			return;
    		}

    		$$invalidate(45, opened = true);
    	}

    	function close() {
    		if (debug) {
    			console.log("close");
    		}

    		$$invalidate(45, opened = false);

    		if (!text && selectFirstIfEmpty) {
    			highlightFilter = 0;
    			selectItem();
    		}
    	}

    	function isMinCharsToSearchReached() {
    		return minCharactersToSearch > 1 && filteredTextLength < minCharactersToSearch;
    	}

    	function closeIfMinCharsToSearchReached() {
    		if (isMinCharsToSearchReached()) {
    			close();
    		}
    	}

    	function clear() {
    		if (debug) {
    			console.log("clear");
    		}

    		$$invalidate(12, text = "");
    		$$invalidate(28, selectedItem = undefined);

    		setTimeout(() => {
    			input.focus();
    			close();
    		});
    	}

    	// 'item number one'.replace(/(it)(.*)(nu)(.*)(one)/ig, '<b>$1</b>$2 <b>$3</b>$4 <b>$5</b>')
    	function highlightFilter(q, fields) {
    		const qs = "(" + q.trim().replace(/\s/g, ")(.*)(") + ")";
    		const reg = new RegExp(qs, "ig");
    		let n = 1;
    		const len = qs.split(")(").length + 1;
    		let repl = "";
    		for (; n < len; n++) repl += n % 2 ? `<b>$${n}</b>` : `$${n}`;

    		return i => {
    			const newI = Object.assign({ highlighted: {} }, i);

    			if (fields) {
    				fields.forEach(f => {
    					if (!newI[f]) return;
    					newI.highlighted[f] = newI[f].replace(reg, repl);
    				});
    			}

    			return newI;
    		};
    	}

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			input = $$value;
    			$$invalidate(13, input);
    		});
    	}

    	function input_1_input_handler() {
    		text = this.value;
    		$$invalidate(12, text);
    	}

    	const click_handler = listItem => onListItemClick(listItem);

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			list = $$value;
    			$$invalidate(14, list);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("items" in $$props) $$invalidate(27, items = $$props.items);
    		if ("labelFieldName" in $$props) $$invalidate(30, labelFieldName = $$props.labelFieldName);
    		if ("keywordsFieldName" in $$props) $$invalidate(31, keywordsFieldName = $$props.keywordsFieldName);
    		if ("valueFieldName" in $$props) $$invalidate(32, valueFieldName = $$props.valueFieldName);
    		if ("labelFunction" in $$props) $$invalidate(33, labelFunction = $$props.labelFunction);
    		if ("keywordsFunction" in $$props) $$invalidate(34, keywordsFunction = $$props.keywordsFunction);
    		if ("valueFunction" in $$props) $$invalidate(35, valueFunction = $$props.valueFunction);
    		if ("keywordsCleanFunction" in $$props) $$invalidate(36, keywordsCleanFunction = $$props.keywordsCleanFunction);
    		if ("textCleanFunction" in $$props) $$invalidate(37, textCleanFunction = $$props.textCleanFunction);
    		if ("searchFunction" in $$props) $$invalidate(38, searchFunction = $$props.searchFunction);
    		if ("beforeChange" in $$props) $$invalidate(39, beforeChange = $$props.beforeChange);
    		if ("onChange" in $$props) $$invalidate(40, onChange = $$props.onChange);
    		if ("selectFirstIfEmpty" in $$props) $$invalidate(41, selectFirstIfEmpty = $$props.selectFirstIfEmpty);
    		if ("minCharactersToSearch" in $$props) $$invalidate(42, minCharactersToSearch = $$props.minCharactersToSearch);
    		if ("maxItemsToShowInList" in $$props) $$invalidate(0, maxItemsToShowInList = $$props.maxItemsToShowInList);
    		if ("noResultsText" in $$props) $$invalidate(1, noResultsText = $$props.noResultsText);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("className" in $$props) $$invalidate(3, className = $$props.className);
    		if ("inputClassName" in $$props) $$invalidate(4, inputClassName = $$props.inputClassName);
    		if ("inputId" in $$props) $$invalidate(5, inputId = $$props.inputId);
    		if ("name" in $$props) $$invalidate(6, name = $$props.name);
    		if ("dropdownClassName" in $$props) $$invalidate(7, dropdownClassName = $$props.dropdownClassName);
    		if ("hideArrow" in $$props) $$invalidate(8, hideArrow = $$props.hideArrow);
    		if ("showClear" in $$props) $$invalidate(9, showClear = $$props.showClear);
    		if ("disabled" in $$props) $$invalidate(10, disabled = $$props.disabled);
    		if ("title" in $$props) $$invalidate(11, title = $$props.title);
    		if ("debug" in $$props) $$invalidate(43, debug = $$props.debug);
    		if ("selectedItem" in $$props) $$invalidate(28, selectedItem = $$props.selectedItem);
    		if ("value" in $$props) $$invalidate(29, value = $$props.value);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*selectedItem*/ 268435456) {
    			(onSelectedItemChanged());
    		}

    		if ($$self.$$.dirty[0] & /*items*/ 134217728 | $$self.$$.dirty[1] & /*opened, filteredTextLength*/ 24576) {
    			$$invalidate(17, showList = opened && (items && items.length > 0 || filteredTextLength > 0));
    		}

    		if ($$self.$$.dirty[0] & /*items*/ 134217728) {
    			(prepareListItems());
    		}
    	};

    	return [
    		maxItemsToShowInList,
    		noResultsText,
    		placeholder,
    		className,
    		inputClassName,
    		inputId,
    		name,
    		dropdownClassName,
    		hideArrow,
    		showClear,
    		disabled,
    		title,
    		text,
    		input,
    		list,
    		highlightIndex,
    		filteredListItems,
    		showList,
    		uniqueId,
    		onListItemClick,
    		onDocumentClick,
    		onKeyDown,
    		onKeyPress,
    		onInput,
    		onInputClick,
    		onFocus,
    		clear,
    		items,
    		selectedItem,
    		value,
    		labelFieldName,
    		keywordsFieldName,
    		valueFieldName,
    		labelFunction,
    		keywordsFunction,
    		valueFunction,
    		keywordsCleanFunction,
    		textCleanFunction,
    		searchFunction,
    		beforeChange,
    		onChange,
    		selectFirstIfEmpty,
    		minCharactersToSearch,
    		debug,
    		filteredTextLength,
    		opened,
    		input_1_binding,
    		input_1_input_handler,
    		click_handler,
    		div0_binding
    	];
    }

    class SimpleAutocomplete extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$k,
    			create_fragment$k,
    			safe_not_equal,
    			{
    				items: 27,
    				labelFieldName: 30,
    				keywordsFieldName: 31,
    				valueFieldName: 32,
    				labelFunction: 33,
    				keywordsFunction: 34,
    				valueFunction: 35,
    				keywordsCleanFunction: 36,
    				textCleanFunction: 37,
    				searchFunction: 38,
    				beforeChange: 39,
    				onChange: 40,
    				selectFirstIfEmpty: 41,
    				minCharactersToSearch: 42,
    				maxItemsToShowInList: 0,
    				noResultsText: 1,
    				placeholder: 2,
    				className: 3,
    				inputClassName: 4,
    				inputId: 5,
    				name: 6,
    				dropdownClassName: 7,
    				hideArrow: 8,
    				showClear: 9,
    				disabled: 10,
    				title: 11,
    				debug: 43,
    				selectedItem: 28,
    				value: 29
    			},
    			[-1, -1, -1]
    		);
    	}
    }

    /* node_modules/not-bulma/src/form/ui.autocomplete.svelte generated by Svelte v3.35.0 */

    function create_else_block$d(ctx) {
    	let div;
    	let autocomplete;
    	let updating_selectedItem;
    	let t;
    	let if_block_anchor;
    	let current;

    	function autocomplete_selectedItem_binding(value) {
    		/*autocomplete_selectedItem_binding*/ ctx[24](value);
    	}

    	let autocomplete_props = {
    		showClear: /*showClear*/ ctx[8],
    		disabled: /*disabled*/ ctx[11],
    		placeholder: /*placeholder*/ ctx[9],
    		noResultsText: /*noResultsText*/ ctx[7],
    		onChange: /*onChange*/ ctx[19],
    		searchFunction: /*searchFunction*/ ctx[16],
    		hideArrow: true,
    		labelFieldName: /*labelField*/ ctx[3],
    		valueFieldName: /*idField*/ ctx[2],
    		minCharactersToSearch: /*minCharactersToSearch*/ ctx[4],
    		selectFirstIfEmpty: /*selectFirstIfEmpty*/ ctx[5],
    		maxItemsToShowInList: /*maxItemsToShowInList*/ ctx[6]
    	};

    	if (/*value*/ ctx[1] !== void 0) {
    		autocomplete_props.selectedItem = /*value*/ ctx[1];
    	}

    	autocomplete = new SimpleAutocomplete({ props: autocomplete_props });
    	binding_callbacks.push(() => bind(autocomplete, "selectedItem", autocomplete_selectedItem_binding));
    	let if_block = !(/*validated*/ ctx[15] && /*valid*/ ctx[14]) && /*inputStarted*/ ctx[0] && create_if_block_1$b(ctx);

    	return {
    		c() {
    			div = element("div");
    			create_component(autocomplete.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr(div, "class", "control");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(autocomplete, div, null);
    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const autocomplete_changes = {};
    			if (dirty & /*showClear*/ 256) autocomplete_changes.showClear = /*showClear*/ ctx[8];
    			if (dirty & /*disabled*/ 2048) autocomplete_changes.disabled = /*disabled*/ ctx[11];
    			if (dirty & /*placeholder*/ 512) autocomplete_changes.placeholder = /*placeholder*/ ctx[9];
    			if (dirty & /*noResultsText*/ 128) autocomplete_changes.noResultsText = /*noResultsText*/ ctx[7];
    			if (dirty & /*searchFunction*/ 65536) autocomplete_changes.searchFunction = /*searchFunction*/ ctx[16];
    			if (dirty & /*labelField*/ 8) autocomplete_changes.labelFieldName = /*labelField*/ ctx[3];
    			if (dirty & /*idField*/ 4) autocomplete_changes.valueFieldName = /*idField*/ ctx[2];
    			if (dirty & /*minCharactersToSearch*/ 16) autocomplete_changes.minCharactersToSearch = /*minCharactersToSearch*/ ctx[4];
    			if (dirty & /*selectFirstIfEmpty*/ 32) autocomplete_changes.selectFirstIfEmpty = /*selectFirstIfEmpty*/ ctx[5];
    			if (dirty & /*maxItemsToShowInList*/ 64) autocomplete_changes.maxItemsToShowInList = /*maxItemsToShowInList*/ ctx[6];

    			if (!updating_selectedItem && dirty & /*value*/ 2) {
    				updating_selectedItem = true;
    				autocomplete_changes.selectedItem = /*value*/ ctx[1];
    				add_flush_callback(() => updating_selectedItem = false);
    			}

    			autocomplete.$set(autocomplete_changes);

    			if (!(/*validated*/ ctx[15] && /*valid*/ ctx[14]) && /*inputStarted*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$b(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(autocomplete.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(autocomplete.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(autocomplete);
    			if (detaching) detach(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (55:0) {#if readonly }
    function create_if_block$f(ctx) {
    	let uitextfield;
    	let current;

    	uitextfield = new Ui_textfield({
    			props: {
    				value: /*value*/ ctx[1] ? /*value*/ ctx[1].title : "",
    				fieldname: /*fieldname*/ ctx[10],
    				placeholder: /*placeholder*/ ctx[9],
    				icon: /*icon*/ ctx[13]
    			}
    		});

    	return {
    		c() {
    			create_component(uitextfield.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uitextfield, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uitextfield_changes = {};
    			if (dirty & /*value*/ 2) uitextfield_changes.value = /*value*/ ctx[1] ? /*value*/ ctx[1].title : "";
    			if (dirty & /*fieldname*/ 1024) uitextfield_changes.fieldname = /*fieldname*/ ctx[10];
    			if (dirty & /*placeholder*/ 512) uitextfield_changes.placeholder = /*placeholder*/ ctx[9];
    			if (dirty & /*icon*/ 8192) uitextfield_changes.icon = /*icon*/ ctx[13];
    			uitextfield.$set(uitextfield_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uitextfield.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uitextfield.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uitextfield, detaching);
    		}
    	};
    }

    // (75:0) {#if !(validated && valid) && (inputStarted) }
    function create_if_block_1$b(ctx) {
    	let p;
    	let t;
    	let p_class_value;
    	let p_id_value;

    	return {
    		c() {
    			p = element("p");
    			t = text(/*helper*/ ctx[17]);
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[18]);
    			attr(p, "id", p_id_value = "input-field-helper-" + /*fieldname*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 131072) set_data(t, /*helper*/ ctx[17]);

    			if (dirty & /*validationClasses*/ 262144 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[18])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 1024 && p_id_value !== (p_id_value = "input-field-helper-" + /*fieldname*/ ctx[10])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    function create_fragment$j(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$f, create_else_block$d];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*readonly*/ ctx[12]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let allErrors;
    	let helper;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { idField = "_id" } = $$props;
    	let { labelField = "title" } = $$props;
    	let { minCharactersToSearch = 3 } = $$props;
    	let { selectFirstIfEmpty = false } = $$props;
    	let { maxItemsToShowInList = 20 } = $$props;
    	let { noResultsText = "Ничего не найдено" } = $$props;
    	let { showClear = true } = $$props;
    	let { value } = $$props;
    	let { placeholder = "" } = $$props;
    	let { fieldname = "checkbox-list" } = $$props;
    	let { disabled = false } = $$props;
    	let { readonly = false } = $$props;
    	let { icon = false } = $$props;
    	let { inputStarted = false } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	let { searchFunction = term => {
    		return [];
    	} } = $$props;

    	function onChange() {
    		let data = { field: fieldname, value };
    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function autocomplete_selectedItem_binding(value$1) {
    		value = value$1;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("idField" in $$props) $$invalidate(2, idField = $$props.idField);
    		if ("labelField" in $$props) $$invalidate(3, labelField = $$props.labelField);
    		if ("minCharactersToSearch" in $$props) $$invalidate(4, minCharactersToSearch = $$props.minCharactersToSearch);
    		if ("selectFirstIfEmpty" in $$props) $$invalidate(5, selectFirstIfEmpty = $$props.selectFirstIfEmpty);
    		if ("maxItemsToShowInList" in $$props) $$invalidate(6, maxItemsToShowInList = $$props.maxItemsToShowInList);
    		if ("noResultsText" in $$props) $$invalidate(7, noResultsText = $$props.noResultsText);
    		if ("showClear" in $$props) $$invalidate(8, showClear = $$props.showClear);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("placeholder" in $$props) $$invalidate(9, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(10, fieldname = $$props.fieldname);
    		if ("disabled" in $$props) $$invalidate(11, disabled = $$props.disabled);
    		if ("readonly" in $$props) $$invalidate(12, readonly = $$props.readonly);
    		if ("icon" in $$props) $$invalidate(13, icon = $$props.icon);
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("valid" in $$props) $$invalidate(14, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(15, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(20, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(21, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(22, formLevelError = $$props.formLevelError);
    		if ("searchFunction" in $$props) $$invalidate(16, searchFunction = $$props.searchFunction);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 8192) ;

    		if ($$self.$$.dirty & /*errors, formErrors*/ 3145728) {
    			$$invalidate(23, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 8389120) {
    			$$invalidate(17, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 4210688) ;

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 16385) {
    			$$invalidate(18, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		idField,
    		labelField,
    		minCharactersToSearch,
    		selectFirstIfEmpty,
    		maxItemsToShowInList,
    		noResultsText,
    		showClear,
    		placeholder,
    		fieldname,
    		disabled,
    		readonly,
    		icon,
    		valid,
    		validated,
    		searchFunction,
    		helper,
    		validationClasses,
    		onChange,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		autocomplete_selectedItem_binding
    	];
    }

    class Ui_autocomplete extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {
    			idField: 2,
    			labelField: 3,
    			minCharactersToSearch: 4,
    			selectFirstIfEmpty: 5,
    			maxItemsToShowInList: 6,
    			noResultsText: 7,
    			showClear: 8,
    			value: 1,
    			placeholder: 9,
    			fieldname: 10,
    			disabled: 11,
    			readonly: 12,
    			icon: 13,
    			inputStarted: 0,
    			valid: 14,
    			validated: 15,
    			errors: 20,
    			formErrors: 21,
    			formLevelError: 22,
    			searchFunction: 16
    		});
    	}
    }

    const FIELDS = new Lib();
    const COMPONENTS = new Lib();
    const VARIANTS = new Lib();

    /* node_modules/not-bulma/src/form/field.svelte generated by Svelte v3.35.0 */

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context$6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (82:0) {:else}
    function create_else_block$c(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	let each_value_2 = /*controls*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", div_class_value = "field " + /*fieldClasses*/ ctx[4] + " " + /*fieldId*/ ctx[6]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*COMPONENTS, controls, name, onControlChange*/ 138) {
    				each_value_2 = /*controls*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*fieldClasses, fieldId*/ 80 && div_class_value !== (div_class_value = "field " + /*fieldClasses*/ ctx[4] + " " + /*fieldId*/ ctx[6])) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (71:0) {#if horizontal}
    function create_if_block_1$a(ctx) {
    	let div2;
    	let div0;
    	let uilabel;
    	let t;
    	let div1;
    	let div2_class_value;
    	let current;

    	uilabel = new Ui_label({
    			props: {
    				id: /*fieldId*/ ctx[6],
    				label: /*label*/ ctx[0] || /*controls*/ ctx[3][0].label
    			}
    		});

    	let each_value_1 = /*controls*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$3(get_each_context_1$3(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(uilabel.$$.fragment);
    			t = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div0, "class", "field-label is-normal");
    			attr(div1, "class", "field-body");
    			attr(div1, "id", /*fieldId*/ ctx[6]);
    			attr(div2, "class", div2_class_value = "field is-horizontal " + /*fieldClasses*/ ctx[4] + " " + /*fieldId*/ ctx[6]);
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			mount_component(uilabel, div0, null);
    			append(div2, t);
    			append(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			const uilabel_changes = {};
    			if (dirty & /*fieldId*/ 64) uilabel_changes.id = /*fieldId*/ ctx[6];
    			if (dirty & /*label, controls*/ 9) uilabel_changes.label = /*label*/ ctx[0] || /*controls*/ ctx[3][0].label;
    			uilabel.$set(uilabel_changes);

    			if (dirty & /*COMPONENTS, controls, name, onControlChange*/ 138) {
    				each_value_1 = /*controls*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$3(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*fieldId*/ 64) {
    				attr(div1, "id", /*fieldId*/ ctx[6]);
    			}

    			if (!current || dirty & /*fieldClasses, fieldId*/ 80 && div2_class_value !== (div2_class_value = "field is-horizontal " + /*fieldClasses*/ ctx[4] + " " + /*fieldId*/ ctx[6])) {
    				attr(div2, "class", div2_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uilabel.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(uilabel.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			destroy_component(uilabel);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (63:0) {#if hidden }
    function create_if_block$e(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*controls*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*COMPONENTS, controls, name, onControlChange*/ 138) {
    				each_value = /*controls*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$6(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$6(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (84:2) {#each controls as control}
    function create_each_block_2(ctx) {
    	let uilabel;
    	let t;
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	uilabel = new Ui_label({
    			props: {
    				id: "form-field-" + /*control*/ ctx[18].component + "-" + /*name*/ ctx[1],
    				label: /*control*/ ctx[18].label
    			}
    		});

    	const switch_instance_spread_levels = [/*control*/ ctx[18], { fieldname: /*name*/ ctx[1] }];
    	var switch_value = COMPONENTS.get(/*control*/ ctx[18].component);

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("change", /*onControlChange*/ ctx[7]);
    	}

    	return {
    		c() {
    			create_component(uilabel.$$.fragment);
    			t = space();
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			mount_component(uilabel, target, anchor);
    			insert(target, t, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uilabel_changes = {};
    			if (dirty & /*controls, name*/ 10) uilabel_changes.id = "form-field-" + /*control*/ ctx[18].component + "-" + /*name*/ ctx[1];
    			if (dirty & /*controls*/ 8) uilabel_changes.label = /*control*/ ctx[18].label;
    			uilabel.$set(uilabel_changes);

    			const switch_instance_changes = (dirty & /*controls, name*/ 10)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*controls*/ 8 && get_spread_object(/*control*/ ctx[18]),
    					dirty & /*name*/ 2 && { fieldname: /*name*/ ctx[1] }
    				])
    			: {};

    			if (switch_value !== (switch_value = COMPONENTS.get(/*control*/ ctx[18].component))) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("change", /*onControlChange*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uilabel.$$.fragment, local);
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uilabel.$$.fragment, local);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uilabel, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (77:4) {#each controls as control}
    function create_each_block_1$3(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*control*/ ctx[18], { fieldname: /*name*/ ctx[1] }];
    	var switch_value = COMPONENTS.get(/*control*/ ctx[18].component);

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("change", /*onControlChange*/ ctx[7]);
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*controls, name*/ 10)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*controls*/ 8 && get_spread_object(/*control*/ ctx[18]),
    					dirty & /*name*/ 2 && { fieldname: /*name*/ ctx[1] }
    				])
    			: {};

    			if (switch_value !== (switch_value = COMPONENTS.get(/*control*/ ctx[18].component))) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("change", /*onControlChange*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (65:0) {#each controls as control}
    function create_each_block$6(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*control*/ ctx[18], { fieldname: /*name*/ ctx[1] }];
    	var switch_value = COMPONENTS.get(/*control*/ ctx[18].component);

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("change", /*onControlChange*/ ctx[7]);
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*controls, name*/ 10)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*controls*/ 8 && get_spread_object(/*control*/ ctx[18]),
    					dirty & /*name*/ 2 && { fieldname: /*name*/ ctx[1] }
    				])
    			: {};

    			if (switch_value !== (switch_value = COMPONENTS.get(/*control*/ ctx[18].component))) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("change", /*onControlChange*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    function create_fragment$i(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$e, create_if_block_1$a, create_else_block$c];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*hidden*/ ctx[5]) return 0;
    		if (/*horizontal*/ ctx[2]) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let dispatch = createEventDispatcher();
    	let { label = "" } = $$props;
    	let { name = "generic field" } = $$props;
    	let { readonly = false } = $$props;
    	let { horizontal = false } = $$props;
    	let { controls = [] } = $$props;
    	let { classes = "" } = $$props;
    	let { addons = false } = $$props;
    	let { addonsCentered = false } = $$props;
    	let { addonsRight = false } = $$props;
    	let { grouped = false } = $$props;
    	let { groupedMultiline = false } = $$props;
    	let { groupedRight = false } = $$props;
    	let { groupedCentered = false } = $$props;
    	let fieldClasses = "";
    	let hidden = false;
    	let fieldId;

    	onMount(() => {
    		$$invalidate(4, fieldClasses += " " + classes);
    		$$invalidate(4, fieldClasses += addons ? " has-addons " : "");
    		$$invalidate(4, fieldClasses += addonsCentered ? " has-addons-centered " : "");
    		$$invalidate(4, fieldClasses += addonsRight ? " has-addons-right " : "");
    		$$invalidate(4, fieldClasses += grouped ? " is-grouped " : "");
    		$$invalidate(4, fieldClasses += groupedMultiline ? " is-grouped-multiline " : "");
    		$$invalidate(4, fieldClasses += groupedRight ? " is-grouped-right " : "");
    		$$invalidate(4, fieldClasses += groupedCentered ? " is-grouped-centered " : "");

    		if (readonly) {
    			controls.forEach(control => {
    				control.readonly = true;
    			});
    		}

    		let notHidden = controls.filter(control => control.component !== "UIHidden");
    		$$invalidate(5, hidden = notHidden.length === 0);
    		let tmp = controls.map(itm => itm.component).join("_");
    		$$invalidate(6, fieldId = `form-field-${tmp}-${name}`);
    	});

    	function onControlChange(ev) {
    		let data = ev.detail;
    		dispatch("change", data);
    	}

    	$$self.$$set = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("readonly" in $$props) $$invalidate(8, readonly = $$props.readonly);
    		if ("horizontal" in $$props) $$invalidate(2, horizontal = $$props.horizontal);
    		if ("controls" in $$props) $$invalidate(3, controls = $$props.controls);
    		if ("classes" in $$props) $$invalidate(9, classes = $$props.classes);
    		if ("addons" in $$props) $$invalidate(10, addons = $$props.addons);
    		if ("addonsCentered" in $$props) $$invalidate(11, addonsCentered = $$props.addonsCentered);
    		if ("addonsRight" in $$props) $$invalidate(12, addonsRight = $$props.addonsRight);
    		if ("grouped" in $$props) $$invalidate(13, grouped = $$props.grouped);
    		if ("groupedMultiline" in $$props) $$invalidate(14, groupedMultiline = $$props.groupedMultiline);
    		if ("groupedRight" in $$props) $$invalidate(15, groupedRight = $$props.groupedRight);
    		if ("groupedCentered" in $$props) $$invalidate(16, groupedCentered = $$props.groupedCentered);
    	};

    	return [
    		label,
    		name,
    		horizontal,
    		controls,
    		fieldClasses,
    		hidden,
    		fieldId,
    		onControlChange,
    		readonly,
    		classes,
    		addons,
    		addonsCentered,
    		addonsRight,
    		grouped,
    		groupedMultiline,
    		groupedRight,
    		groupedCentered
    	];
    }

    class Field extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {
    			label: 0,
    			name: 1,
    			readonly: 8,
    			horizontal: 2,
    			controls: 3,
    			classes: 9,
    			addons: 10,
    			addonsCentered: 11,
    			addonsRight: 12,
    			grouped: 13,
    			groupedMultiline: 14,
    			groupedRight: 15,
    			groupedCentered: 16
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/form.svelte generated by Svelte v3.35.0 */

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i];
    	return child_ctx;
    }

    // (305:0) {:else}
    function create_else_block$b(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let if_block3_anchor;
    	let current;
    	let if_block0 = /*title*/ ctx[5] && create_if_block_15(ctx);
    	let if_block1 = /*description*/ ctx[6] && create_if_block_14(ctx);
    	let if_block2 = /*options*/ ctx[2].buttonsFirst && create_if_block_10(ctx);
    	let each_value = /*fields*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block3 = !/*options*/ ctx[2].buttonsFirst && create_if_block_1$9(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			if (if_block3) if_block3.c();
    			if_block3_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, t2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t3, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert(target, if_block3_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_15(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*description*/ ctx[6]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_14(ctx);
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*options*/ ctx[2].buttonsFirst) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_10(ctx);
    					if_block2.c();
    					if_block2.m(t2.parentNode, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty[0] & /*fields, form, options, onFieldChange*/ 34822) {
    				each_value = /*fields*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t3.parentNode, t3);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!/*options*/ ctx[2].buttonsFirst) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_1$9(ctx);
    					if_block3.c();
    					if_block3.m(if_block3_anchor.parentNode, if_block3_anchor);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(t2);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t3);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach(if_block3_anchor);
    		}
    	};
    }

    // (301:0) {#if success}
    function create_if_block$d(ctx) {
    	let div;
    	let h3;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			h3 = element("h3");
    			t = text(/*SUCCESS_TEXT*/ ctx[3]);
    			attr(h3, "class", "form-success-message");
    			attr(div, "class", "notification is-success");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h3);
    			append(h3, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*SUCCESS_TEXT*/ 8) set_data(t, /*SUCCESS_TEXT*/ ctx[3]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (306:0) {#if title }
    function create_if_block_15(ctx) {
    	let h5;
    	let t;

    	return {
    		c() {
    			h5 = element("h5");
    			t = text(/*title*/ ctx[5]);
    			attr(h5, "class", "title is-5");
    		},
    		m(target, anchor) {
    			insert(target, h5, anchor);
    			append(h5, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*title*/ 32) set_data(t, /*title*/ ctx[5]);
    		},
    		d(detaching) {
    			if (detaching) detach(h5);
    		}
    	};
    }

    // (309:0) {#if description }
    function create_if_block_14(ctx) {
    	let h6;
    	let t;

    	return {
    		c() {
    			h6 = element("h6");
    			t = text(/*description*/ ctx[6]);
    			attr(h6, "class", "subtitle is-6");
    		},
    		m(target, anchor) {
    			insert(target, h6, anchor);
    			append(h6, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*description*/ 64) set_data(t, /*description*/ ctx[6]);
    		},
    		d(detaching) {
    			if (detaching) detach(h6);
    		}
    	};
    }

    // (313:0) {#if options.buttonsFirst }
    function create_if_block_10(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let if_block0 = /*cancel*/ ctx[8].enabled && create_if_block_13(ctx);
    	let if_block1 = /*submit*/ ctx[7].enabled && create_if_block_12(ctx);
    	let if_block2 = /*formErrors*/ ctx[12].length > 0 && create_if_block_11(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr(div, "class", "buttons is-grouped is-centered");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			insert(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*cancel*/ ctx[8].enabled) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_13(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*submit*/ ctx[7].enabled) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_12(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*formErrors*/ ctx[12].length > 0) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_11(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    		}
    	};
    }

    // (315:1) {#if cancel.enabled}
    function create_if_block_13(ctx) {
    	let button;
    	let t_value = /*cancel*/ ctx[8].caption + "";
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t = text(t_value);
    			attr(button, "class", button_class_value = "button is-outlined " + /*cancel*/ ctx[8].classes);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t);

    			if (!mounted) {
    				dispose = listen(button, "click", function () {
    					if (is_function(/*rejectForm*/ ctx[10])) /*rejectForm*/ ctx[10].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*cancel*/ 256 && t_value !== (t_value = /*cancel*/ ctx[8].caption + "")) set_data(t, t_value);

    			if (dirty[0] & /*cancel*/ 256 && button_class_value !== (button_class_value = "button is-outlined " + /*cancel*/ ctx[8].classes)) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (318:1) {#if submit.enabled}
    function create_if_block_12(ctx) {
    	let button;
    	let t_value = /*submit*/ ctx[7].caption + "";
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t = text(t_value);
    			button.disabled = /*formInvalid*/ ctx[14];
    			attr(button, "class", button_class_value = "button is-primary is-hovered " + /*submit*/ ctx[7].classes);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t);

    			if (!mounted) {
    				dispose = listen(button, "click", function () {
    					if (is_function(/*submitForm*/ ctx[9])) /*submitForm*/ ctx[9].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*submit*/ 128 && t_value !== (t_value = /*submit*/ ctx[7].caption + "")) set_data(t, t_value);

    			if (dirty[0] & /*formInvalid*/ 16384) {
    				button.disabled = /*formInvalid*/ ctx[14];
    			}

    			if (dirty[0] & /*submit*/ 128 && button_class_value !== (button_class_value = "button is-primary is-hovered " + /*submit*/ ctx[7].classes)) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (323:0) {#if formErrors.length > 0 }
    function create_if_block_11(ctx) {
    	let div;
    	let t_value = /*formErrors*/ ctx[12].join(", ") + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "edit-form-error notification is-danger");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*formErrors*/ 4096 && t_value !== (t_value = /*formErrors*/ ctx[12].join(", ") + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (361:0) {:else}
    function create_else_block_2$1(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*field*/ ctx[40] + "";
    	let t1;
    	let t2;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Field '");
    			t1 = text(t1_value);
    			t2 = text("' is not registered");
    			attr(div, "class", "notification is-danger");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*fields*/ 2 && t1_value !== (t1_value = /*field*/ ctx[40] + "")) set_data(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (351:0) {#if form[field] && form[field].component }
    function create_if_block_8$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*form*/ ctx[11][/*field*/ ctx[40]].visible && create_if_block_9$1(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*form*/ ctx[11][/*field*/ ctx[40]].visible) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*form, fields*/ 2050) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_9$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (330:0) {#if Array.isArray(field) }
    function create_if_block_5$1(ctx) {
    	let div;
    	let current;
    	let each_value_1 = /*field*/ ctx[40];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "columns");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*form, fields, options, onFieldChange*/ 34822) {
    				each_value_1 = /*field*/ ctx[40];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (352:0) {#if form[field].visible}
    function create_if_block_9$1(ctx) {
    	let uifield;
    	let current;

    	uifield = new Field({
    			props: {
    				controls: [/*form*/ ctx[11][/*field*/ ctx[40]]],
    				name: /*field*/ ctx[40],
    				horizontal: /*options*/ ctx[2].horizontal,
    				label: /*form*/ ctx[11][/*field*/ ctx[40]].label
    			}
    		});

    	uifield.$on("change", /*onFieldChange*/ ctx[15]);

    	return {
    		c() {
    			create_component(uifield.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uifield, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uifield_changes = {};
    			if (dirty[0] & /*form, fields*/ 2050) uifield_changes.controls = [/*form*/ ctx[11][/*field*/ ctx[40]]];
    			if (dirty[0] & /*fields*/ 2) uifield_changes.name = /*field*/ ctx[40];
    			if (dirty[0] & /*options*/ 4) uifield_changes.horizontal = /*options*/ ctx[2].horizontal;
    			if (dirty[0] & /*form, fields*/ 2050) uifield_changes.label = /*form*/ ctx[11][/*field*/ ctx[40]].label;
    			uifield.$set(uifield_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uifield.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uifield.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uifield, detaching);
    		}
    	};
    }

    // (345:1) {:else}
    function create_else_block_1$1(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*subfield*/ ctx[43] + "";
    	let t1;
    	let t2;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Subfield '");
    			t1 = text(t1_value);
    			t2 = text("' is not registered");
    			attr(div, "class", "column notification is-danger");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*fields*/ 2 && t1_value !== (t1_value = /*subfield*/ ctx[43] + "")) set_data(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (333:1) {#if form[subfield] && form[subfield].component }
    function create_if_block_6$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*form*/ ctx[11][/*subfield*/ ctx[43]].visible && create_if_block_7$1(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*form*/ ctx[11][/*subfield*/ ctx[43]].visible) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*form, fields*/ 2050) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_7$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (334:1) {#if form[subfield].visible }
    function create_if_block_7$1(ctx) {
    	let div;
    	let uifield;
    	let div_class_value;
    	let current;

    	uifield = new Field({
    			props: {
    				controls: [/*form*/ ctx[11][/*subfield*/ ctx[43]]],
    				name: /*subfield*/ ctx[43],
    				horizontal: /*options*/ ctx[2].horizontal,
    				label: /*form*/ ctx[11][/*subfield*/ ctx[43]].label
    			}
    		});

    	uifield.$on("change", /*onFieldChange*/ ctx[15]);

    	return {
    		c() {
    			div = element("div");
    			create_component(uifield.$$.fragment);

    			attr(div, "class", div_class_value = "column " + (/*form*/ ctx[11][/*subfield*/ ctx[43]].fieldSize
    			? "is-" + /*form*/ ctx[11][/*subfield*/ ctx[43]].fieldSize
    			: "") + " ");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(uifield, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uifield_changes = {};
    			if (dirty[0] & /*form, fields*/ 2050) uifield_changes.controls = [/*form*/ ctx[11][/*subfield*/ ctx[43]]];
    			if (dirty[0] & /*fields*/ 2) uifield_changes.name = /*subfield*/ ctx[43];
    			if (dirty[0] & /*options*/ 4) uifield_changes.horizontal = /*options*/ ctx[2].horizontal;
    			if (dirty[0] & /*form, fields*/ 2050) uifield_changes.label = /*form*/ ctx[11][/*subfield*/ ctx[43]].label;
    			uifield.$set(uifield_changes);

    			if (!current || dirty[0] & /*form, fields*/ 2050 && div_class_value !== (div_class_value = "column " + (/*form*/ ctx[11][/*subfield*/ ctx[43]].fieldSize
    			? "is-" + /*form*/ ctx[11][/*subfield*/ ctx[43]].fieldSize
    			: "") + " ")) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uifield.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uifield.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(uifield);
    		}
    	};
    }

    // (332:1) {#each field as subfield }
    function create_each_block_1$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_6$1, create_else_block_1$1];
    	const if_blocks = [];

    	function select_block_type_2(ctx, dirty) {
    		if (/*form*/ ctx[11][/*subfield*/ ctx[43]] && /*form*/ ctx[11][/*subfield*/ ctx[43]].component) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_2(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (329:0) {#each fields as field}
    function create_each_block$5(ctx) {
    	let show_if;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_5$1, create_if_block_8$1, create_else_block_2$1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (dirty[0] & /*fields*/ 2) show_if = !!Array.isArray(/*field*/ ctx[40]);
    		if (show_if) return 0;
    		if (/*form*/ ctx[11][/*field*/ ctx[40]] && /*form*/ ctx[11][/*field*/ ctx[40]].component) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type_1(ctx, [-1]);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx, dirty);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (367:0) {#if !options.buttonsFirst }
    function create_if_block_1$9(ctx) {
    	let t0;
    	let div;
    	let t1;
    	let if_block0 = /*formErrors*/ ctx[12].length > 0 && create_if_block_4$7(ctx);
    	let if_block1 = /*cancel*/ ctx[8].enabled && create_if_block_3$7(ctx);
    	let if_block2 = /*submit*/ ctx[7].enabled && create_if_block_2$7(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div = element("div");
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			attr(div, "class", "buttons is-grouped is-centered");
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			if (if_block1) if_block1.m(div, null);
    			append(div, t1);
    			if (if_block2) if_block2.m(div, null);
    		},
    		p(ctx, dirty) {
    			if (/*formErrors*/ ctx[12].length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$7(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*cancel*/ ctx[8].enabled) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3$7(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*submit*/ ctx[7].enabled) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_2$7(ctx);
    					if_block2.c();
    					if_block2.m(div, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};
    }

    // (368:0) {#if formErrors.length > 0 }
    function create_if_block_4$7(ctx) {
    	let div;
    	let t_value = /*formErrors*/ ctx[12].join(", ") + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "edit-form-error notification is-danger");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*formErrors*/ 4096 && t_value !== (t_value = /*formErrors*/ ctx[12].join(", ") + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (372:1) {#if cancel.enabled}
    function create_if_block_3$7(ctx) {
    	let button;
    	let t_value = /*cancel*/ ctx[8].caption + "";
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t = text(t_value);
    			attr(button, "class", button_class_value = "button is-outlined " + /*cancel*/ ctx[8].classes);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t);

    			if (!mounted) {
    				dispose = listen(button, "click", function () {
    					if (is_function(/*rejectForm*/ ctx[10])) /*rejectForm*/ ctx[10].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*cancel*/ 256 && t_value !== (t_value = /*cancel*/ ctx[8].caption + "")) set_data(t, t_value);

    			if (dirty[0] & /*cancel*/ 256 && button_class_value !== (button_class_value = "button is-outlined " + /*cancel*/ ctx[8].classes)) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (375:1) {#if submit.enabled}
    function create_if_block_2$7(ctx) {
    	let button;
    	let t_value = /*submit*/ ctx[7].caption + "";
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t = text(t_value);
    			button.disabled = /*formInvalid*/ ctx[14];
    			attr(button, "class", button_class_value = "button is-primary is-hovered " + /*submit*/ ctx[7].classes);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t);

    			if (!mounted) {
    				dispose = listen(button, "click", function () {
    					if (is_function(/*submitForm*/ ctx[9])) /*submitForm*/ ctx[9].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*submit*/ 128 && t_value !== (t_value = /*submit*/ ctx[7].caption + "")) set_data(t, t_value);

    			if (dirty[0] & /*formInvalid*/ 16384) {
    				button.disabled = /*formInvalid*/ ctx[14];
    			}

    			if (dirty[0] & /*submit*/ 128 && button_class_value !== (button_class_value = "button is-primary is-hovered " + /*submit*/ ctx[7].classes)) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$h(ctx) {
    	let div;
    	let span;
    	let t0;
    	let div_class_value;
    	let t1;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$d, create_else_block$b];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*success*/ ctx[13]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			div = element("div");
    			span = element("span");
    			t0 = text(/*WAITING_TEXT*/ ctx[4]);
    			t1 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			attr(span, "class", "title");
    			attr(div, "class", div_class_value = "pageloader " + (/*loading*/ ctx[0] ? "is-active" : ""));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, span);
    			append(span, t0);
    			insert(target, t1, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty[0] & /*WAITING_TEXT*/ 16) set_data(t0, /*WAITING_TEXT*/ ctx[4]);

    			if (!current || dirty[0] & /*loading*/ 1 && div_class_value !== (div_class_value = "pageloader " + (/*loading*/ ctx[0] ? "is-active" : ""))) {
    				attr(div, "class", div_class_value);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t1);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let formInvalid;
    	let dispatch = createEventDispatcher();
    	let form = {};

    	let validate = () => {
    		return { clean: true };
    	};
    	let formErrors = [];
    	let formHasErrors = false;
    	let fieldsHasErrors = false;
    	let success = false;

    	function fieldInit(type, mutation = {}) {
    		let field = {
    			label: "",
    			placeholder: "",
    			enabled: true,
    			visible: true,
    			value: "",
    			required: true,
    			validated: false,
    			valid: false,
    			errors: false,
    			variants: []
    		};

    		if (FIELDS.contains(type)) {
    			Object.assign(field, FIELDS.get(type));
    		}

    		if (mutation) {
    			Object.assign(field, mutation);
    		}

    		if (Object.prototype.hasOwnProperty.call(field, "variantsSource") && VARIANTS.contains(field.variantsSource)) {
    			field.variants = VARIANTS.get(field.variantsSource);
    		}

    		return field;
    	}

    	function collectData() {
    		let result = {};

    		fields.flat().forEach(fieldname => {
    			if (Object.prototype.hasOwnProperty.call(form, fieldname) && form[fieldname].enabled && form[fieldname].visible) {
    				result[fieldname] = form[fieldname].value;
    			}
    		});

    		return result;
    	}

    	function setFieldInvalid(fieldName, value, errors) {
    		$$invalidate(11, form[fieldName].errors = errors, form);
    		$$invalidate(11, form[fieldName].validated = true, form);
    		$$invalidate(11, form[fieldName].valid = false, form);
    		$$invalidate(11, form[fieldName].value = value, form);
    		$$invalidate(11, form);
    		$$invalidate(33, fieldsHasErrors = true);
    	}

    	function setFieldValid(fieldName, value) {
    		$$invalidate(11, form[fieldName].errors = false, form);
    		$$invalidate(11, form[fieldName].validated = true, form);
    		$$invalidate(11, form[fieldName].valid = true, form);
    		$$invalidate(11, form[fieldName].value = value, form);
    		let some = false;

    		for (let fname in form) {
    			if (fname !== fieldName) {
    				if (Array.isArray(form[fname].errors) && form[fname].errors.length === 0) {
    					$$invalidate(11, form[fname].errors = false, form);
    				}

    				if (form[fname].errors !== false) {
    					some = true;
    					break;
    				}
    			}
    		}

    		$$invalidate(11, form);

    		if (fieldsHasErrors !== some) {
    			$$invalidate(33, fieldsHasErrors = some);
    		}
    	}

    	function fieldIsValid(fieldName) {
    		return !Array.isArray(form[fieldName].errors);
    	}

    	function setFormFieldInvalid(fieldName, errors) {
    		$$invalidate(11, form[fieldName].formErrors = [...errors], form);
    		$$invalidate(11, form[fieldName].validated = true, form);
    		$$invalidate(11, form[fieldName].inputStarted = true, form);
    		$$invalidate(11, form[fieldName].valid = false, form);
    		$$invalidate(11, form[fieldName].formLevelError = true, form);
    		$$invalidate(11, form);
    	}

    	function setFormFieldValid(fieldName, value) {
    		$$invalidate(11, form[fieldName].formErrors = false, form);
    		$$invalidate(11, form[fieldName].validated = true, form);
    		$$invalidate(11, form[fieldName].valid = true, form);
    		$$invalidate(11, form[fieldName].formLevelError = false, form);
    		$$invalidate(11, form);
    	}

    	function fieldErrorsNotChanged(fieldName, errs) {
    		let oldErrs = form[fieldName].errors;

    		if (oldErrs === false && errs === false) {
    			return true;
    		} else {
    			if (Array.isArray(oldErrs) && Array.isArray(errs)) {
    				return oldErrs.join(". ") === errs.join(". ");
    			} else {
    				return false;
    			}
    		}
    	}

    	function initFormByField(fieldName) {
    		if (Array.isArray(fieldName)) {
    			fieldName.forEach(initFormByField);
    		} else {
    			let opts = {};

    			if (Object.prototype.hasOwnProperty.call(options, "fields")) {
    				if (Object.prototype.hasOwnProperty.call(options.fields, fieldName)) {
    					opts = options.fields[fieldName];
    				}
    			}

    			$$invalidate(11, form[fieldName] = fieldInit(fieldName, opts), form);

    			if (options.readonly) {
    				$$invalidate(11, form[fieldName].readonly = true, form);
    			}
    		}
    	}

    	onMount(() => {
    		initFormByField(fields);

    		if (Object.prototype.hasOwnProperty.call(options, "validate") && typeof options.validate === "function") {
    			validate = options.validate;
    		}

    		$$invalidate(11, form);
    	});

    	function addFormError(err) {
    		if (Array.isArray(formErrors)) {
    			if (!formErrors.includes(err)) {
    				formErrors.push(err);
    			}
    		} else {
    			$$invalidate(12, formErrors = [err]);
    		}

    		$$invalidate(32, formHasErrors = true);
    	}

    	function onFieldChange(ev) {
    		let data = ev.detail;

    		if (validation) {
    			//fields level validations
    			let res = typeof form[data.field].validate === "function"
    			? form[data.field].validate(data.value)
    			: [];

    			if (res.length === 0) {
    				setFieldValid(data.field, data.value);
    			} else {
    				setFieldInvalid(data.field, data.value, res);
    			}

    			//form level validations
    			let errors = validate(collectData());

    			if (!errors || errors.clean) {
    				$$invalidate(32, formHasErrors = false);
    				dispatch("change", data);
    			} else {
    				if (errors.form.length === 0 && Object.keys(errors.fields).length === 0) {
    					$$invalidate(32, formHasErrors = false);

    					for (let fieldName in fields.flat()) {
    						setFormFieldValid(fieldName);
    					}

    					dispatch("change", data);
    				} else {
    					if (errors.form.length) {
    						errors.form.forEach(addFormError);
    					} else {
    						$$invalidate(12, formErrors = false);
    					}

    					for (let fieldName of fields.flat()) {
    						if (Object.prototype.hasOwnProperty.call(errors.fields, fieldName)) {
    							setFormFieldInvalid(fieldName, errors.fields[fieldName]);
    						} else {
    							setFormFieldValid(fieldName);
    						}
    					}
    				}
    			}
    		} else {
    			dispatch("change", data);
    		}
    	}

    	let { fields = [] } = $$props;
    	let { options = {} } = $$props;
    	let { validation = true } = $$props;
    	let { SUCCESS_TEXT = "Операция завершена" } = $$props;
    	let { WAITING_TEXT = "Отправка данных на сервер" } = $$props;
    	let { title = "Форма" } = $$props;
    	let { description = "Заполните пожалуйста форму" } = $$props;
    	let { submit = { caption: "Отправить", enabled: true } } = $$props;
    	let { cancel = { caption: "Назад", enabled: true } } = $$props;
    	let { loading = false } = $$props;

    	let { submitForm = e => {
    		e && e.preventDefault();
    		dispatch("submit", collectData());
    		return false;
    	} } = $$props;

    	function showSuccess() {
    		$$invalidate(13, success = true);
    	}

    	let { rejectForm = () => {
    		$$invalidate(0, loading = true);
    		dispatch("reject");
    	} } = $$props;

    	function setLoading() {
    		$$invalidate(0, loading = true);
    	}

    	function resetLoading() {
    		$$invalidate(0, loading = false);
    	}

    	function setFieldsVisibility(fieldsList, val) {
    		if (Array.isArray(fieldsList)) {
    			Object.keys(form).forEach(fieldName => {
    				$$invalidate(11, form[fieldName].visible = fieldsList.includes(fieldName) ? val : !val, form);
    			});

    			$$invalidate(11, form);
    		}
    	}

    	function setVisibleFields(fieldsList) {
    		setFieldsVisibility(fieldsList, true);
    	}

    	function setInvisibleFields(fieldsList) {
    		setFieldsVisibility(fieldsList, false);
    	}

    	function setFieldValue(fieldName, value) {
    		if (Object.prototype.hasOwnProperty.call(form, fieldName)) {
    			$$invalidate(11, form[fieldName].value = value, form);
    			$$invalidate(11, form);
    			onFieldChange({ detail: { field: fieldName, value } });
    		}
    	}

    	$$self.$$set = $$props => {
    		if ("fields" in $$props) $$invalidate(1, fields = $$props.fields);
    		if ("options" in $$props) $$invalidate(2, options = $$props.options);
    		if ("validation" in $$props) $$invalidate(24, validation = $$props.validation);
    		if ("SUCCESS_TEXT" in $$props) $$invalidate(3, SUCCESS_TEXT = $$props.SUCCESS_TEXT);
    		if ("WAITING_TEXT" in $$props) $$invalidate(4, WAITING_TEXT = $$props.WAITING_TEXT);
    		if ("title" in $$props) $$invalidate(5, title = $$props.title);
    		if ("description" in $$props) $$invalidate(6, description = $$props.description);
    		if ("submit" in $$props) $$invalidate(7, submit = $$props.submit);
    		if ("cancel" in $$props) $$invalidate(8, cancel = $$props.cancel);
    		if ("loading" in $$props) $$invalidate(0, loading = $$props.loading);
    		if ("submitForm" in $$props) $$invalidate(9, submitForm = $$props.submitForm);
    		if ("rejectForm" in $$props) $$invalidate(10, rejectForm = $$props.rejectForm);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[1] & /*formHasErrors, fieldsHasErrors*/ 6) {
    			$$invalidate(14, formInvalid = formHasErrors || fieldsHasErrors);
    		}
    	};

    	return [
    		loading,
    		fields,
    		options,
    		SUCCESS_TEXT,
    		WAITING_TEXT,
    		title,
    		description,
    		submit,
    		cancel,
    		submitForm,
    		rejectForm,
    		form,
    		formErrors,
    		success,
    		formInvalid,
    		onFieldChange,
    		collectData,
    		setFieldInvalid,
    		setFieldValid,
    		fieldIsValid,
    		setFormFieldInvalid,
    		setFormFieldValid,
    		fieldErrorsNotChanged,
    		addFormError,
    		validation,
    		showSuccess,
    		setLoading,
    		resetLoading,
    		setFieldsVisibility,
    		setVisibleFields,
    		setInvisibleFields,
    		setFieldValue,
    		formHasErrors,
    		fieldsHasErrors
    	];
    }

    class Form$1 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$h,
    			create_fragment$h,
    			safe_not_equal,
    			{
    				collectData: 16,
    				setFieldInvalid: 17,
    				setFieldValid: 18,
    				fieldIsValid: 19,
    				setFormFieldInvalid: 20,
    				setFormFieldValid: 21,
    				fieldErrorsNotChanged: 22,
    				addFormError: 23,
    				fields: 1,
    				options: 2,
    				validation: 24,
    				SUCCESS_TEXT: 3,
    				WAITING_TEXT: 4,
    				title: 5,
    				description: 6,
    				submit: 7,
    				cancel: 8,
    				loading: 0,
    				submitForm: 9,
    				showSuccess: 25,
    				rejectForm: 10,
    				setLoading: 26,
    				resetLoading: 27,
    				setFieldsVisibility: 28,
    				setVisibleFields: 29,
    				setInvisibleFields: 30,
    				setFieldValue: 31
    			},
    			[-1, -1]
    		);
    	}

    	get collectData() {
    		return this.$$.ctx[16];
    	}

    	get setFieldInvalid() {
    		return this.$$.ctx[17];
    	}

    	get setFieldValid() {
    		return this.$$.ctx[18];
    	}

    	get fieldIsValid() {
    		return this.$$.ctx[19];
    	}

    	get setFormFieldInvalid() {
    		return this.$$.ctx[20];
    	}

    	get setFormFieldValid() {
    		return this.$$.ctx[21];
    	}

    	get fieldErrorsNotChanged() {
    		return this.$$.ctx[22];
    	}

    	get addFormError() {
    		return this.$$.ctx[23];
    	}

    	get showSuccess() {
    		return this.$$.ctx[25];
    	}

    	get setLoading() {
    		return this.$$.ctx[26];
    	}

    	get resetLoading() {
    		return this.$$.ctx[27];
    	}

    	get setFieldsVisibility() {
    		return this.$$.ctx[28];
    	}

    	get setVisibleFields() {
    		return this.$$.ctx[29];
    	}

    	get setInvisibleFields() {
    		return this.$$.ctx[30];
    	}

    	get setFieldValue() {
    		return this.$$.ctx[31];
    	}
    }

    /* node_modules/not-bulma/src/form/ui.checkbox.svelte generated by Svelte v3.35.0 */

    function create_else_block$a(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (59:2) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$c(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[11]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 2048) set_data(t, /*helper*/ ctx[11]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$g(ctx) {
    	let div;
    	let label_1;
    	let input;
    	let input_id_value;
    	let input_aria_controls_value;
    	let input_aria_describedby_value;
    	let t0;
    	let t1;
    	let label_1_for_value;
    	let div_class_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let p_id_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (!(/*validated*/ ctx[9] && /*valid*/ ctx[8]) && /*inputStarted*/ ctx[0]) return create_if_block$c;
    		return create_else_block$a;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			label_1 = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(/*label*/ ctx[2]);
    			t2 = space();
    			p = element("p");
    			if_block.c();
    			attr(input, "type", "checkbox");
    			attr(input, "id", input_id_value = "form-field-checkbox-" + /*fieldname*/ ctx[4]);
    			attr(input, "placeholder", /*placeholder*/ ctx[3]);
    			attr(input, "name", /*fieldname*/ ctx[4]);
    			input.required = /*required*/ ctx[5];
    			input.readOnly = /*readonly*/ ctx[6];
    			attr(input, "invalid", /*invalid*/ ctx[12]);
    			attr(input, "aria-controls", input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[4]);
    			attr(input, "aria-describedby", input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[4]);
    			input.disabled = /*disabled*/ ctx[7];
    			attr(label_1, "class", "checkbox");
    			attr(label_1, "disabled", /*disabled*/ ctx[7]);
    			attr(label_1, "for", label_1_for_value = "form-field-checkbox-" + /*fieldname*/ ctx[4]);
    			attr(div, "class", div_class_value = "control " + /*iconClasses*/ ctx[10]);
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[13]);
    			attr(p, "id", p_id_value = "form-field-helper-" + /*fieldname*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, label_1);
    			append(label_1, input);
    			input.checked = /*value*/ ctx[1];
    			append(label_1, t0);
    			append(label_1, t1);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			if_block.m(p, null);

    			if (!mounted) {
    				dispose = [
    					listen(input, "change", /*input_change_handler*/ ctx[21]),
    					listen(input, "change", /*onBlur*/ ctx[14]),
    					listen(input, "input", /*onInput*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*fieldname*/ 16 && input_id_value !== (input_id_value = "form-field-checkbox-" + /*fieldname*/ ctx[4])) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*placeholder*/ 8) {
    				attr(input, "placeholder", /*placeholder*/ ctx[3]);
    			}

    			if (dirty & /*fieldname*/ 16) {
    				attr(input, "name", /*fieldname*/ ctx[4]);
    			}

    			if (dirty & /*required*/ 32) {
    				input.required = /*required*/ ctx[5];
    			}

    			if (dirty & /*readonly*/ 64) {
    				input.readOnly = /*readonly*/ ctx[6];
    			}

    			if (dirty & /*invalid*/ 4096) {
    				attr(input, "invalid", /*invalid*/ ctx[12]);
    			}

    			if (dirty & /*fieldname*/ 16 && input_aria_controls_value !== (input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[4])) {
    				attr(input, "aria-controls", input_aria_controls_value);
    			}

    			if (dirty & /*fieldname*/ 16 && input_aria_describedby_value !== (input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[4])) {
    				attr(input, "aria-describedby", input_aria_describedby_value);
    			}

    			if (dirty & /*disabled*/ 128) {
    				input.disabled = /*disabled*/ ctx[7];
    			}

    			if (dirty & /*value*/ 2) {
    				input.checked = /*value*/ ctx[1];
    			}

    			if (dirty & /*label*/ 4) set_data(t1, /*label*/ ctx[2]);

    			if (dirty & /*disabled*/ 128) {
    				attr(label_1, "disabled", /*disabled*/ ctx[7]);
    			}

    			if (dirty & /*fieldname*/ 16 && label_1_for_value !== (label_1_for_value = "form-field-checkbox-" + /*fieldname*/ ctx[4])) {
    				attr(label_1, "for", label_1_for_value);
    			}

    			if (dirty & /*iconClasses*/ 1024 && div_class_value !== (div_class_value = "control " + /*iconClasses*/ ctx[10])) {
    				attr(div, "class", div_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 8192 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[13])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 16 && p_id_value !== (p_id_value = "form-field-helper-" + /*fieldname*/ ctx[4])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let iconClasses;
    	let allErrors;
    	let helper;
    	let invalid;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = false } = $$props;
    	let { label = "checkbox" } = $$props;
    	let { placeholder = "checkbox placeholder" } = $$props;
    	let { fieldname = "checkbox" } = $$props;
    	let { icon = false } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;
    	let { disabled = false } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.type === "checkbox"
    			? ev.currentTarget.checked
    			: value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function onInput(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.type === "checkbox"
    			? ev.currentTarget.checked
    			: value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function input_change_handler() {
    		value = this.checked;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("placeholder" in $$props) $$invalidate(3, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(4, fieldname = $$props.fieldname);
    		if ("icon" in $$props) $$invalidate(16, icon = $$props.icon);
    		if ("required" in $$props) $$invalidate(5, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(6, readonly = $$props.readonly);
    		if ("disabled" in $$props) $$invalidate(7, disabled = $$props.disabled);
    		if ("valid" in $$props) $$invalidate(8, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(9, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(17, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(18, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(19, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 65536) {
    			$$invalidate(10, iconClasses = (icon ? " has-icons-left " : "") + " has-icons-right ");
    		}

    		if ($$self.$$.dirty & /*errors, formErrors*/ 393216) {
    			$$invalidate(20, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 1048584) {
    			$$invalidate(11, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 524544) {
    			$$invalidate(12, invalid = valid === false || formLevelError);
    		}

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 257) {
    			$$invalidate(13, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		label,
    		placeholder,
    		fieldname,
    		required,
    		readonly,
    		disabled,
    		valid,
    		validated,
    		iconClasses,
    		helper,
    		invalid,
    		validationClasses,
    		onBlur,
    		onInput,
    		icon,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		input_change_handler
    	];
    }

    class Ui_checkbox extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			label: 2,
    			placeholder: 3,
    			fieldname: 4,
    			icon: 16,
    			required: 5,
    			readonly: 6,
    			disabled: 7,
    			valid: 8,
    			validated: 9,
    			errors: 17,
    			formErrors: 18,
    			formLevelError: 19
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.checkbox.list.svelte generated by Svelte v3.35.0 */

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	child_ctx[19] = list;
    	child_ctx[20] = i;
    	return child_ctx;
    }

    // (55:2) {#each value as item(item.id) }
    function create_each_block$4(key_1, ctx) {
    	let label;
    	let input;
    	let input_data_id_value;
    	let input_id_value;
    	let input_placeholder_value;
    	let input_name_value;
    	let input_aria_controls_value;
    	let input_aria_describedby_value;
    	let input_disabled_value;
    	let t0;
    	let t1_value = /*item*/ ctx[18].label + "";
    	let t1;
    	let t2;
    	let label_disabled_value;
    	let label_for_value;
    	let mounted;
    	let dispose;

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[16].call(input, /*each_value*/ ctx[19], /*item_index*/ ctx[20]);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			attr(input, "data-id", input_data_id_value = /*item*/ ctx[18].id);
    			attr(input, "id", input_id_value = "form-field-checkboxlist-" + (/*fieldname*/ ctx[2] + "_" + /*item*/ ctx[18].id));
    			attr(input, "type", "checkbox");
    			attr(input, "placeholder", input_placeholder_value = /*item*/ ctx[18].placeholder);
    			attr(input, "name", input_name_value = /*fieldname*/ ctx[2] + "_" + /*item*/ ctx[18].id);
    			input.readOnly = /*readonly*/ ctx[3];
    			attr(input, "invalid", /*invalid*/ ctx[8]);
    			attr(input, "aria-controls", input_aria_controls_value = "input-field-helper-" + (/*fieldname*/ ctx[2] + "_" + /*item*/ ctx[18].id));
    			attr(input, "aria-describedby", input_aria_describedby_value = "input-field-helper-" + (/*fieldname*/ ctx[2] + "_" + /*item*/ ctx[18].id));
    			input.disabled = input_disabled_value = /*disabled*/ ctx[4] || /*item*/ ctx[18].disabled;
    			attr(label, "class", "checkbox pr-2");
    			attr(label, "disabled", label_disabled_value = /*disabled*/ ctx[4] || /*item*/ ctx[18].disabled);
    			attr(label, "for", label_for_value = "form-field-checkbox-" + (/*fieldname*/ ctx[2] + "_" + /*item*/ ctx[18].id));
    			this.first = label;
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);
    			input.checked = /*item*/ ctx[18].value;
    			append(label, t0);
    			append(label, t1);
    			append(label, t2);

    			if (!mounted) {
    				dispose = [
    					listen(input, "change", input_change_handler),
    					listen(input, "change", /*onBlur*/ ctx[10]),
    					listen(input, "input", /*onInput*/ ctx[11])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*value*/ 2 && input_data_id_value !== (input_data_id_value = /*item*/ ctx[18].id)) {
    				attr(input, "data-id", input_data_id_value);
    			}

    			if (dirty & /*fieldname, value*/ 6 && input_id_value !== (input_id_value = "form-field-checkboxlist-" + (/*fieldname*/ ctx[2] + "_" + /*item*/ ctx[18].id))) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*value*/ 2 && input_placeholder_value !== (input_placeholder_value = /*item*/ ctx[18].placeholder)) {
    				attr(input, "placeholder", input_placeholder_value);
    			}

    			if (dirty & /*fieldname, value*/ 6 && input_name_value !== (input_name_value = /*fieldname*/ ctx[2] + "_" + /*item*/ ctx[18].id)) {
    				attr(input, "name", input_name_value);
    			}

    			if (dirty & /*readonly*/ 8) {
    				input.readOnly = /*readonly*/ ctx[3];
    			}

    			if (dirty & /*invalid*/ 256) {
    				attr(input, "invalid", /*invalid*/ ctx[8]);
    			}

    			if (dirty & /*fieldname, value*/ 6 && input_aria_controls_value !== (input_aria_controls_value = "input-field-helper-" + (/*fieldname*/ ctx[2] + "_" + /*item*/ ctx[18].id))) {
    				attr(input, "aria-controls", input_aria_controls_value);
    			}

    			if (dirty & /*fieldname, value*/ 6 && input_aria_describedby_value !== (input_aria_describedby_value = "input-field-helper-" + (/*fieldname*/ ctx[2] + "_" + /*item*/ ctx[18].id))) {
    				attr(input, "aria-describedby", input_aria_describedby_value);
    			}

    			if (dirty & /*disabled, value*/ 18 && input_disabled_value !== (input_disabled_value = /*disabled*/ ctx[4] || /*item*/ ctx[18].disabled)) {
    				input.disabled = input_disabled_value;
    			}

    			if (dirty & /*value*/ 2) {
    				input.checked = /*item*/ ctx[18].value;
    			}

    			if (dirty & /*value*/ 2 && t1_value !== (t1_value = /*item*/ ctx[18].label + "")) set_data(t1, t1_value);

    			if (dirty & /*disabled, value*/ 18 && label_disabled_value !== (label_disabled_value = /*disabled*/ ctx[4] || /*item*/ ctx[18].disabled)) {
    				attr(label, "disabled", label_disabled_value);
    			}

    			if (dirty & /*fieldname, value*/ 6 && label_for_value !== (label_for_value = "form-field-checkbox-" + (/*fieldname*/ ctx[2] + "_" + /*item*/ ctx[18].id))) {
    				attr(label, "for", label_for_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (79:2) {:else}
    function create_else_block$9(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (77:2) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$b(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[7]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 128) set_data(t, /*helper*/ ctx[7]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$f(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t;
    	let p;
    	let p_class_value;
    	let p_id_value;
    	let each_value = /*value*/ ctx[1];
    	const get_key = ctx => /*item*/ ctx[18].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$4(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
    	}

    	function select_block_type(ctx, dirty) {
    		if (!(/*validated*/ ctx[6] && /*valid*/ ctx[5]) && /*inputStarted*/ ctx[0]) return create_if_block$b;
    		return create_else_block$9;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			p = element("p");
    			if_block.c();
    			attr(div, "class", "control");
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[9]);
    			attr(p, "id", p_id_value = "form-field-helper-" + /*fieldname*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			insert(target, t, anchor);
    			insert(target, p, anchor);
    			if_block.m(p, null);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*disabled, value, fieldname, readonly, invalid, onBlur, onInput*/ 3358) {
    				each_value = /*value*/ ctx[1];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, destroy_block, create_each_block$4, null, get_each_context$4);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 512 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[9])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 4 && p_id_value !== (p_id_value = "form-field-helper-" + /*fieldname*/ ctx[2])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching) detach(t);
    			if (detaching) detach(p);
    			if_block.d();
    		}
    	};
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let allErrors;
    	let helper;
    	let invalid;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = [] } = $$props;
    	let { fieldname = "checkbox-list" } = $$props;
    	let { readonly = false } = $$props;
    	let { disabled = false } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		let id = parseInt(ev.currentTarget.dataset.id);
    		let copy = [...value];
    		copy.find(itm => itm.id == id).value = ev.currentTarget.checked;
    		let data = { id, field: fieldname, value: copy };
    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function onInput(ev) {
    		let id = parseInt(ev.currentTarget.dataset.id);
    		let copy = [...value];
    		copy.find(itm => itm.id === id).value = ev.currentTarget.checked;
    		let data = { id, field: fieldname, value: copy };
    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function input_change_handler(each_value, item_index) {
    		each_value[item_index].value = this.checked;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("fieldname" in $$props) $$invalidate(2, fieldname = $$props.fieldname);
    		if ("readonly" in $$props) $$invalidate(3, readonly = $$props.readonly);
    		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
    		if ("valid" in $$props) $$invalidate(5, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(6, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(12, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(13, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(14, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*errors, formErrors*/ 12288) {
    			$$invalidate(15, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors*/ 32768) {
    			$$invalidate(7, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 16416) {
    			$$invalidate(8, invalid = valid === false || formLevelError);
    		}

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 33) {
    			$$invalidate(9, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		fieldname,
    		readonly,
    		disabled,
    		valid,
    		validated,
    		helper,
    		invalid,
    		validationClasses,
    		onBlur,
    		onInput,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		input_change_handler
    	];
    }

    class Ui_checkbox_list extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			fieldname: 2,
    			readonly: 3,
    			disabled: 4,
    			valid: 5,
    			validated: 6,
    			errors: 12,
    			formErrors: 13,
    			formLevelError: 14
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.color.svelte generated by Svelte v3.35.0 */

    function create_if_block_4$6(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[4]);
    			attr(span, "class", "icon is-small is-left");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon*/ 16 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[4])) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (61:4) {#if validated === true }
    function create_if_block_1$8(ctx) {
    	let span;

    	function select_block_type(ctx, dirty) {
    		if (/*valid*/ ctx[7] === true) return create_if_block_2$6;
    		if (/*valid*/ ctx[7] === false) return create_if_block_3$6;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr(span, "class", "icon is-small is-right");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};
    }

    // (65:35) 
    function create_if_block_3$6(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-exclamation-triangle");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (63:6) {#if valid === true }
    function create_if_block_2$6(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-check");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (74:4) {:else}
    function create_else_block$8(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (72:4) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$a(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 1024) set_data(t, /*helper*/ ctx[10]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$e(ctx) {
    	let div;
    	let input;
    	let input_id_value;
    	let input_class_value;
    	let input_aria_controls_value;
    	let input_aria_describedby_value;
    	let t0;
    	let t1;
    	let div_class_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let p_id_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*icon*/ ctx[4] && create_if_block_4$6(ctx);
    	let if_block1 = /*validated*/ ctx[8] === true && create_if_block_1$8(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!(/*validated*/ ctx[8] && /*valid*/ ctx[7]) && /*inputStarted*/ ctx[0]) return create_if_block$a;
    		return create_else_block$8;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block2 = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			p = element("p");
    			if_block2.c();
    			attr(input, "id", input_id_value = "form-field-color-" + /*fieldname*/ ctx[3]);
    			attr(input, "class", input_class_value = "input " + /*validationClasses*/ ctx[12]);
    			attr(input, "type", "color");
    			attr(input, "name", /*fieldname*/ ctx[3]);
    			attr(input, "invalid", /*invalid*/ ctx[11]);
    			input.required = /*required*/ ctx[5];
    			attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			attr(input, "aria-controls", input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			input.readOnly = /*readonly*/ ctx[6];
    			attr(input, "aria-describedby", input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(div, "class", div_class_value = "control " + /*iconClasses*/ ctx[9]);
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[12]);
    			attr(p, "id", p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			set_input_value(input, /*value*/ ctx[1]);
    			append(div, t0);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			if_block2.m(p, null);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[19]),
    					listen(input, "change", /*onBlur*/ ctx[13]),
    					listen(input, "input", /*onInput*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*fieldname*/ 8 && input_id_value !== (input_id_value = "form-field-color-" + /*fieldname*/ ctx[3])) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*validationClasses*/ 4096 && input_class_value !== (input_class_value = "input " + /*validationClasses*/ ctx[12])) {
    				attr(input, "class", input_class_value);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "name", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*invalid*/ 2048) {
    				attr(input, "invalid", /*invalid*/ ctx[11]);
    			}

    			if (dirty & /*required*/ 32) {
    				input.required = /*required*/ ctx[5];
    			}

    			if (dirty & /*placeholder*/ 4) {
    				attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_controls_value !== (input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-controls", input_aria_controls_value);
    			}

    			if (dirty & /*readonly*/ 64) {
    				input.readOnly = /*readonly*/ ctx[6];
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_describedby_value !== (input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-describedby", input_aria_describedby_value);
    			}

    			if (dirty & /*value*/ 2) {
    				set_input_value(input, /*value*/ ctx[1]);
    			}

    			if (/*icon*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$6(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*validated*/ ctx[8] === true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$8(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*iconClasses*/ 512 && div_class_value !== (div_class_value = "control " + /*iconClasses*/ ctx[9])) {
    				attr(div, "class", div_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 4096 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[12])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 8 && p_id_value !== (p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    			if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let iconClasses;
    	let allErrors;
    	let helper;
    	let invalid;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = "" } = $$props;
    	let { placeholder = "Select you favorite color" } = $$props;
    	let { fieldname = "color" } = $$props;
    	let { icon = false } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function onInput(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(3, fieldname = $$props.fieldname);
    		if ("icon" in $$props) $$invalidate(4, icon = $$props.icon);
    		if ("required" in $$props) $$invalidate(5, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(6, readonly = $$props.readonly);
    		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(8, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(15, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(16, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(17, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 16) {
    			$$invalidate(9, iconClasses = (icon ? " has-icons-left " : "") + " has-icons-right ");
    		}

    		if ($$self.$$.dirty & /*errors, formErrors*/ 98304) {
    			$$invalidate(18, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 262148) {
    			$$invalidate(10, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 131200) {
    			$$invalidate(11, invalid = valid === false || formLevelError);
    		}

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 129) {
    			$$invalidate(12, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		placeholder,
    		fieldname,
    		icon,
    		required,
    		readonly,
    		valid,
    		validated,
    		iconClasses,
    		helper,
    		invalid,
    		validationClasses,
    		onBlur,
    		onInput,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		input_input_handler
    	];
    }

    class Ui_color extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			placeholder: 2,
    			fieldname: 3,
    			icon: 4,
    			required: 5,
    			readonly: 6,
    			valid: 7,
    			validated: 8,
    			errors: 15,
    			formErrors: 16,
    			formLevelError: 17
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.date.svelte generated by Svelte v3.35.0 */

    function create_if_block_4$5(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[4]);
    			attr(span, "class", "icon is-small is-left");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon*/ 16 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[4])) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (62:4) {#if validated === true }
    function create_if_block_1$7(ctx) {
    	let span;

    	function select_block_type(ctx, dirty) {
    		if (/*valid*/ ctx[7] === true) return create_if_block_2$5;
    		if (/*valid*/ ctx[7] === false) return create_if_block_3$5;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr(span, "class", "icon is-small is-right");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};
    }

    // (66:35) 
    function create_if_block_3$5(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-exclamation-triangle");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (64:6) {#if valid === true }
    function create_if_block_2$5(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-check");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (75:4) {:else}
    function create_else_block$7(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (73:4) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$9(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 1024) set_data(t, /*helper*/ ctx[10]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let div;
    	let input;
    	let input_class_value;
    	let input_id_value;
    	let input_aria_controls_value;
    	let input_aria_describedby_value;
    	let t0;
    	let t1;
    	let div_class_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let p_id_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*icon*/ ctx[4] && create_if_block_4$5(ctx);
    	let if_block1 = /*validated*/ ctx[8] === true && create_if_block_1$7(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!(/*validated*/ ctx[8] && /*valid*/ ctx[7]) && /*inputStarted*/ ctx[0]) return create_if_block$9;
    		return create_else_block$7;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block2 = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			p = element("p");
    			if_block2.c();
    			attr(input, "class", input_class_value = "input " + /*validationClasses*/ ctx[12]);
    			attr(input, "id", input_id_value = "form-field-date-" + /*fieldname*/ ctx[3]);
    			attr(input, "type", "date");
    			attr(input, "name", /*fieldname*/ ctx[3]);
    			attr(input, "invalid", /*invalid*/ ctx[11]);
    			input.required = /*required*/ ctx[5];
    			attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			input.readOnly = /*readonly*/ ctx[6];
    			attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			attr(input, "aria-controls", input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(input, "aria-describedby", input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(div, "class", div_class_value = "control " + /*iconClasses*/ ctx[9]);
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[12]);
    			attr(p, "id", p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			set_input_value(input, /*value*/ ctx[1]);
    			append(div, t0);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			if_block2.m(p, null);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[19]),
    					listen(input, "change", /*onBlur*/ ctx[13]),
    					listen(input, "input", /*onInput*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*validationClasses*/ 4096 && input_class_value !== (input_class_value = "input " + /*validationClasses*/ ctx[12])) {
    				attr(input, "class", input_class_value);
    			}

    			if (dirty & /*fieldname*/ 8 && input_id_value !== (input_id_value = "form-field-date-" + /*fieldname*/ ctx[3])) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "name", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*invalid*/ 2048) {
    				attr(input, "invalid", /*invalid*/ ctx[11]);
    			}

    			if (dirty & /*required*/ 32) {
    				input.required = /*required*/ ctx[5];
    			}

    			if (dirty & /*placeholder*/ 4) {
    				attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*readonly*/ 64) {
    				input.readOnly = /*readonly*/ ctx[6];
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_controls_value !== (input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-controls", input_aria_controls_value);
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_describedby_value !== (input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-describedby", input_aria_describedby_value);
    			}

    			if (dirty & /*value*/ 2) {
    				set_input_value(input, /*value*/ ctx[1]);
    			}

    			if (/*icon*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$5(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*validated*/ ctx[8] === true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$7(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*iconClasses*/ 512 && div_class_value !== (div_class_value = "control " + /*iconClasses*/ ctx[9])) {
    				attr(div, "class", div_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 4096 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[12])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 8 && p_id_value !== (p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    			if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let iconClasses;
    	let allErrors;
    	let helper;
    	let invalid;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = "" } = $$props;
    	let { placeholder = "Date and time of event" } = $$props;
    	let { fieldname = "datetime" } = $$props;
    	let { icon = false } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function onInput(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(3, fieldname = $$props.fieldname);
    		if ("icon" in $$props) $$invalidate(4, icon = $$props.icon);
    		if ("required" in $$props) $$invalidate(5, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(6, readonly = $$props.readonly);
    		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(8, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(15, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(16, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(17, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 16) {
    			$$invalidate(9, iconClasses = (icon ? " has-icons-left " : "") + " has-icons-right ");
    		}

    		if ($$self.$$.dirty & /*errors, formErrors*/ 98304) {
    			$$invalidate(18, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 262148) {
    			$$invalidate(10, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 131200) {
    			$$invalidate(11, invalid = valid === false || formLevelError);
    		}

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 129) {
    			$$invalidate(12, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		placeholder,
    		fieldname,
    		icon,
    		required,
    		readonly,
    		valid,
    		validated,
    		iconClasses,
    		helper,
    		invalid,
    		validationClasses,
    		onBlur,
    		onInput,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		input_input_handler
    	];
    }

    class Ui_date extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			placeholder: 2,
    			fieldname: 3,
    			icon: 4,
    			required: 5,
    			readonly: 6,
    			valid: 7,
    			validated: 8,
    			errors: 15,
    			formErrors: 16,
    			formLevelError: 17
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.email.svelte generated by Svelte v3.35.0 */

    function create_if_block_4$4(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[4]);
    			attr(span, "class", "icon is-small is-left");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon*/ 16 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[4])) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (62:4) {#if validated === true }
    function create_if_block_1$6(ctx) {
    	let span;

    	function select_block_type(ctx, dirty) {
    		if (/*valid*/ ctx[7] === true) return create_if_block_2$4;
    		if (/*valid*/ ctx[7] === false) return create_if_block_3$4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr(span, "class", "icon is-small is-right");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};
    }

    // (66:35) 
    function create_if_block_3$4(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-exclamation-triangle");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (64:6) {#if valid === true }
    function create_if_block_2$4(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-check");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (75:4) {:else}
    function create_else_block$6(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (73:4) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$8(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 1024) set_data(t, /*helper*/ ctx[10]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$c(ctx) {
    	let div;
    	let input;
    	let input_class_value;
    	let input_id_value;
    	let input_aria_controls_value;
    	let input_aria_describedby_value;
    	let t0;
    	let t1;
    	let div_class_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let p_id_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*icon*/ ctx[4] && create_if_block_4$4(ctx);
    	let if_block1 = /*validated*/ ctx[8] === true && create_if_block_1$6(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!(/*validated*/ ctx[8] && /*valid*/ ctx[7]) && /*inputStarted*/ ctx[0]) return create_if_block$8;
    		return create_else_block$6;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block2 = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			p = element("p");
    			if_block2.c();
    			attr(input, "class", input_class_value = "input " + /*validationClasses*/ ctx[12]);
    			attr(input, "id", input_id_value = "form-field-email-" + /*fieldname*/ ctx[3]);
    			attr(input, "type", "email");
    			attr(input, "name", /*fieldname*/ ctx[3]);
    			attr(input, "invalid", /*invalid*/ ctx[11]);
    			input.required = /*required*/ ctx[5];
    			attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			attr(input, "aria-controls", input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			input.readOnly = /*readonly*/ ctx[6];
    			attr(input, "aria-describedby", input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(div, "class", div_class_value = "control " + /*iconClasses*/ ctx[9]);
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[12]);
    			attr(p, "id", p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			set_input_value(input, /*value*/ ctx[1]);
    			append(div, t0);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			if_block2.m(p, null);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[19]),
    					listen(input, "change", /*onBlur*/ ctx[13]),
    					listen(input, "input", /*onInput*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*validationClasses*/ 4096 && input_class_value !== (input_class_value = "input " + /*validationClasses*/ ctx[12])) {
    				attr(input, "class", input_class_value);
    			}

    			if (dirty & /*fieldname*/ 8 && input_id_value !== (input_id_value = "form-field-email-" + /*fieldname*/ ctx[3])) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "name", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*invalid*/ 2048) {
    				attr(input, "invalid", /*invalid*/ ctx[11]);
    			}

    			if (dirty & /*required*/ 32) {
    				input.required = /*required*/ ctx[5];
    			}

    			if (dirty & /*placeholder*/ 4) {
    				attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_controls_value !== (input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-controls", input_aria_controls_value);
    			}

    			if (dirty & /*readonly*/ 64) {
    				input.readOnly = /*readonly*/ ctx[6];
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_describedby_value !== (input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-describedby", input_aria_describedby_value);
    			}

    			if (dirty & /*value*/ 2 && input.value !== /*value*/ ctx[1]) {
    				set_input_value(input, /*value*/ ctx[1]);
    			}

    			if (/*icon*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$4(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*validated*/ ctx[8] === true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$6(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*iconClasses*/ 512 && div_class_value !== (div_class_value = "control " + /*iconClasses*/ ctx[9])) {
    				attr(div, "class", div_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 4096 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[12])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 8 && p_id_value !== (p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    			if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let iconClasses;
    	let allErrors;
    	let helper;
    	let invalid;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = "" } = $$props;
    	let { placeholder = "" } = $$props;
    	let { fieldname = "email" } = $$props;
    	let { icon = false } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function onInput(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(3, fieldname = $$props.fieldname);
    		if ("icon" in $$props) $$invalidate(4, icon = $$props.icon);
    		if ("required" in $$props) $$invalidate(5, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(6, readonly = $$props.readonly);
    		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(8, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(15, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(16, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(17, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 16) {
    			$$invalidate(9, iconClasses = (icon ? " has-icons-left " : "") + " has-icons-right ");
    		}

    		if ($$self.$$.dirty & /*errors, formErrors*/ 98304) {
    			$$invalidate(18, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 262148) {
    			$$invalidate(10, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 131200) {
    			$$invalidate(11, invalid = valid === false || formLevelError);
    		}

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 129) {
    			$$invalidate(12, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		placeholder,
    		fieldname,
    		icon,
    		required,
    		readonly,
    		valid,
    		validated,
    		iconClasses,
    		helper,
    		invalid,
    		validationClasses,
    		onBlur,
    		onInput,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		input_input_handler
    	];
    }

    class Ui_email extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			placeholder: 2,
    			fieldname: 3,
    			icon: 4,
    			required: 5,
    			readonly: 6,
    			valid: 7,
    			validated: 8,
    			errors: 15,
    			formErrors: 16,
    			formLevelError: 17
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.hidden.svelte generated by Svelte v3.35.0 */

    function create_fragment$b(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			input = element("input");
    			attr(input, "type", "hidden");
    			input.required = /*required*/ ctx[2];
    			input.readOnly = /*readonly*/ ctx[3];
    			attr(input, "name", /*fieldname*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			set_input_value(input, /*value*/ ctx[0]);

    			if (!mounted) {
    				dispose = listen(input, "input", /*input_input_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*required*/ 4) {
    				input.required = /*required*/ ctx[2];
    			}

    			if (dirty & /*readonly*/ 8) {
    				input.readOnly = /*readonly*/ ctx[3];
    			}

    			if (dirty & /*fieldname*/ 2) {
    				attr(input, "name", /*fieldname*/ ctx[1]);
    			}

    			if (dirty & /*value*/ 1) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(input);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { value = "" } = $$props;
    	let { fieldname = "hidden" } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("fieldname" in $$props) $$invalidate(1, fieldname = $$props.fieldname);
    		if ("required" in $$props) $$invalidate(2, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(3, readonly = $$props.readonly);
    	};

    	return [value, fieldname, required, readonly, input_input_handler];
    }

    class Ui_hidden extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
    			value: 0,
    			fieldname: 1,
    			required: 2,
    			readonly: 3
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.password.svelte generated by Svelte v3.35.0 */

    function create_if_block_4$3(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[4]);
    			attr(span, "class", "icon is-small is-left");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon*/ 16 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[4])) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (58:4) {#if validated === true }
    function create_if_block_1$5(ctx) {
    	let span;

    	function select_block_type(ctx, dirty) {
    		if (/*valid*/ ctx[7] === true) return create_if_block_2$3;
    		if (/*valid*/ ctx[7] === false) return create_if_block_3$3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr(span, "class", "icon is-small is-right");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};
    }

    // (62:35) 
    function create_if_block_3$3(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-exclamation-triangle");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (60:6) {#if valid === true }
    function create_if_block_2$3(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-check");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (71:4) {:else}
    function create_else_block$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (69:4) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$7(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 1024) set_data(t, /*helper*/ ctx[10]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$a(ctx) {
    	let div;
    	let input;
    	let input_class_value;
    	let input_id_value;
    	let input_aria_controls_value;
    	let input_aria_describedby_value;
    	let t0;
    	let t1;
    	let div_class_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let p_id_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*icon*/ ctx[4] && create_if_block_4$3(ctx);
    	let if_block1 = /*validated*/ ctx[8] === true && create_if_block_1$5(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!(/*validated*/ ctx[8] && /*valid*/ ctx[7]) && /*inputStarted*/ ctx[0]) return create_if_block$7;
    		return create_else_block$5;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block2 = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			p = element("p");
    			if_block2.c();
    			attr(input, "class", input_class_value = "input " + /*validationClasses*/ ctx[12]);
    			input.readOnly = /*readonly*/ ctx[6];
    			attr(input, "id", input_id_value = "form-field-password-" + /*fieldname*/ ctx[3]);
    			attr(input, "type", "password");
    			attr(input, "name", /*fieldname*/ ctx[3]);
    			attr(input, "invalid", /*invalid*/ ctx[11]);
    			input.required = /*required*/ ctx[5];
    			attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			attr(input, "aria-controls", input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(input, "aria-describedby", input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(div, "class", div_class_value = "control " + /*iconClasses*/ ctx[9]);
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[12]);
    			attr(p, "id", p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			set_input_value(input, /*value*/ ctx[1]);
    			append(div, t0);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			if_block2.m(p, null);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[19]),
    					listen(input, "change", /*onBlur*/ ctx[13]),
    					listen(input, "input", /*onInput*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*validationClasses*/ 4096 && input_class_value !== (input_class_value = "input " + /*validationClasses*/ ctx[12])) {
    				attr(input, "class", input_class_value);
    			}

    			if (dirty & /*readonly*/ 64) {
    				input.readOnly = /*readonly*/ ctx[6];
    			}

    			if (dirty & /*fieldname*/ 8 && input_id_value !== (input_id_value = "form-field-password-" + /*fieldname*/ ctx[3])) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "name", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*invalid*/ 2048) {
    				attr(input, "invalid", /*invalid*/ ctx[11]);
    			}

    			if (dirty & /*required*/ 32) {
    				input.required = /*required*/ ctx[5];
    			}

    			if (dirty & /*placeholder*/ 4) {
    				attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_controls_value !== (input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-controls", input_aria_controls_value);
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_describedby_value !== (input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-describedby", input_aria_describedby_value);
    			}

    			if (dirty & /*value*/ 2 && input.value !== /*value*/ ctx[1]) {
    				set_input_value(input, /*value*/ ctx[1]);
    			}

    			if (/*icon*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$3(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*validated*/ ctx[8] === true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$5(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*iconClasses*/ 512 && div_class_value !== (div_class_value = "control " + /*iconClasses*/ ctx[9])) {
    				attr(div, "class", div_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 4096 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[12])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 8 && p_id_value !== (p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    			if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let iconClasses;
    	let allErrors;
    	let helper;
    	let invalid;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = "" } = $$props;
    	let { placeholder = "input some text here, please" } = $$props;
    	let { fieldname = "password" } = $$props;
    	let { icon = false } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function onInput(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(3, fieldname = $$props.fieldname);
    		if ("icon" in $$props) $$invalidate(4, icon = $$props.icon);
    		if ("required" in $$props) $$invalidate(5, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(6, readonly = $$props.readonly);
    		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(8, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(15, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(16, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(17, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 16) {
    			$$invalidate(9, iconClasses = (icon ? " has-icons-left " : "") + " has-icons-right ");
    		}

    		if ($$self.$$.dirty & /*errors, formErrors*/ 98304) {
    			$$invalidate(18, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 262148) {
    			$$invalidate(10, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 131200) {
    			$$invalidate(11, invalid = valid === false || formLevelError);
    		}

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 129) {
    			$$invalidate(12, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		placeholder,
    		fieldname,
    		icon,
    		required,
    		readonly,
    		valid,
    		validated,
    		iconClasses,
    		helper,
    		invalid,
    		validationClasses,
    		onBlur,
    		onInput,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		input_input_handler
    	];
    }

    class Ui_password extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			placeholder: 2,
    			fieldname: 3,
    			icon: 4,
    			required: 5,
    			readonly: 6,
    			valid: 7,
    			validated: 8,
    			errors: 15,
    			formErrors: 16,
    			formLevelError: 17
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.radio.svelte generated by Svelte v3.35.0 */

    class Ui_radio extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, null, safe_not_equal, {});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.radiogroup.svelte generated by Svelte v3.35.0 */

    class Ui_radiogroup extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, null, safe_not_equal, {});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.range.svelte generated by Svelte v3.35.0 */

    class Ui_range extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, null, safe_not_equal, {});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.select.svelte generated by Svelte v3.35.0 */

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    // (93:6) {:else}
    function create_else_block_2(ctx) {
    	let select;
    	let if_block_anchor;
    	let select_id_value;
    	let mounted;
    	let dispose;
    	let if_block = /*placeholder*/ ctx[3].length > 0 && create_if_block_8(ctx);
    	let each_value_1 = /*variants*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			select = element("select");
    			if (if_block) if_block.c();
    			if_block_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(select, "id", select_id_value = "form-field-select-" + /*fieldname*/ ctx[4]);
    			attr(select, "name", /*fieldname*/ ctx[4]);
    			attr(select, "readonly", /*readonly*/ ctx[7]);
    			if (/*value*/ ctx[1] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[22].call(select));
    		},
    		m(target, anchor) {
    			insert(target, select, anchor);
    			if (if_block) if_block.m(select, null);
    			append(select, if_block_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*value*/ ctx[1]);

    			if (!mounted) {
    				dispose = [
    					listen(select, "change", /*select_change_handler*/ ctx[22]),
    					listen(select, "blur", /*onBlur*/ ctx[16]),
    					listen(select, "input", /*onInput*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*placeholder*/ ctx[3].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_8(ctx);
    					if_block.c();
    					if_block.m(select, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*variants, value*/ 6) {
    				each_value_1 = /*variants*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty & /*fieldname*/ 16 && select_id_value !== (select_id_value = "form-field-select-" + /*fieldname*/ ctx[4])) {
    				attr(select, "id", select_id_value);
    			}

    			if (dirty & /*fieldname*/ 16) {
    				attr(select, "name", /*fieldname*/ ctx[4]);
    			}

    			if (dirty & /*readonly*/ 128) {
    				attr(select, "readonly", /*readonly*/ ctx[7]);
    			}

    			if (dirty & /*value, variants, CLEAR_MACRO*/ 6) {
    				select_option(select, /*value*/ ctx[1]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(select);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (77:6) {#if multiple }
    function create_if_block_5(ctx) {
    	let select;
    	let if_block_anchor;
    	let select_id_value;
    	let mounted;
    	let dispose;
    	let if_block = /*placeholder*/ ctx[3].length > 0 && create_if_block_6(ctx);
    	let each_value = /*variants*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	return {
    		c() {
    			select = element("select");
    			if (if_block) if_block.c();
    			if_block_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(select, "id", select_id_value = "form-field-select-" + /*fieldname*/ ctx[4]);
    			attr(select, "name", /*fieldname*/ ctx[4]);
    			attr(select, "size", /*size*/ ctx[9]);
    			attr(select, "readonly", /*readonly*/ ctx[7]);
    			select.required = /*required*/ ctx[6];
    			select.multiple = true;
    		},
    		m(target, anchor) {
    			insert(target, select, anchor);
    			if (if_block) if_block.m(select, null);
    			append(select, if_block_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen(select, "blur", /*onBlur*/ ctx[16]),
    					listen(select, "input", /*onInput*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*placeholder*/ ctx[3].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_6(ctx);
    					if_block.c();
    					if_block.m(select, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*variants, value*/ 6) {
    				each_value = /*variants*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*fieldname*/ 16 && select_id_value !== (select_id_value = "form-field-select-" + /*fieldname*/ ctx[4])) {
    				attr(select, "id", select_id_value);
    			}

    			if (dirty & /*fieldname*/ 16) {
    				attr(select, "name", /*fieldname*/ ctx[4]);
    			}

    			if (dirty & /*size*/ 512) {
    				attr(select, "size", /*size*/ ctx[9]);
    			}

    			if (dirty & /*readonly*/ 128) {
    				attr(select, "readonly", /*readonly*/ ctx[7]);
    			}

    			if (dirty & /*required*/ 64) {
    				select.required = /*required*/ ctx[6];
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(select);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (96:8) {#if placeholder.length > 0 }
    function create_if_block_8(ctx) {
    	let if_block_anchor;

    	function select_block_type_2(ctx, dirty) {
    		if (/*value*/ ctx[1]) return create_if_block_9;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (99:8) {:else}
    function create_else_block_3(ctx) {
    	let option;
    	let t;

    	return {
    		c() {
    			option = element("option");
    			t = text(/*placeholder*/ ctx[3]);
    			option.__value = CLEAR_MACRO;
    			option.value = option.__value;
    			option.selected = "selected";
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*placeholder*/ 8) set_data(t, /*placeholder*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (97:8) {#if value }
    function create_if_block_9(ctx) {
    	let option;
    	let t;

    	return {
    		c() {
    			option = element("option");
    			t = text(/*placeholder*/ ctx[3]);
    			option.__value = CLEAR_MACRO;
    			option.value = option.__value;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*placeholder*/ 8) set_data(t, /*placeholder*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (103:8) {#each variants as variant}
    function create_each_block_1$1(ctx) {
    	let option;
    	let t_value = /*variant*/ ctx[25].title + "";
    	let t;
    	let option_value_value;
    	let option_selected_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*variant*/ ctx[25].id;
    			option.value = option.__value;
    			option.selected = option_selected_value = /*value*/ ctx[1] == /*variant*/ ctx[25].id;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*variants*/ 4 && t_value !== (t_value = /*variant*/ ctx[25].title + "")) set_data(t, t_value);

    			if (dirty & /*variants*/ 4 && option_value_value !== (option_value_value = /*variant*/ ctx[25].id)) {
    				option.__value = option_value_value;
    				option.value = option.__value;
    			}

    			if (dirty & /*value, variants, CLEAR_MACRO*/ 6 && option_selected_value !== (option_selected_value = /*value*/ ctx[1] == /*variant*/ ctx[25].id)) {
    				option.selected = option_selected_value;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (82:8) {#if placeholder.length > 0 }
    function create_if_block_6(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*value*/ ctx[1]) return create_if_block_7;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (85:8) {:else}
    function create_else_block_1(ctx) {
    	let option;
    	let t;

    	return {
    		c() {
    			option = element("option");
    			t = text(/*placeholder*/ ctx[3]);
    			option.__value = CLEAR_MACRO;
    			option.value = option.__value;
    			option.selected = "selected";
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*placeholder*/ 8) set_data(t, /*placeholder*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (83:8) {#if value }
    function create_if_block_7(ctx) {
    	let option;
    	let t;

    	return {
    		c() {
    			option = element("option");
    			t = text(/*placeholder*/ ctx[3]);
    			option.__value = CLEAR_MACRO;
    			option.value = option.__value;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*placeholder*/ 8) set_data(t, /*placeholder*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (89:8) {#each variants as variant}
    function create_each_block$3(ctx) {
    	let option;
    	let t_value = /*variant*/ ctx[25].title + "";
    	let t;
    	let option_value_value;
    	let option_selected_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*variant*/ ctx[25].id;
    			option.value = option.__value;
    			option.selected = option_selected_value = /*value*/ ctx[1].indexOf(/*variant*/ ctx[25].id) > -1;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*variants*/ 4 && t_value !== (t_value = /*variant*/ ctx[25].title + "")) set_data(t, t_value);

    			if (dirty & /*variants*/ 4 && option_value_value !== (option_value_value = /*variant*/ ctx[25].id)) {
    				option.__value = option_value_value;
    				option.value = option.__value;
    			}

    			if (dirty & /*value, variants, CLEAR_MACRO*/ 6 && option_selected_value !== (option_selected_value = /*value*/ ctx[1].indexOf(/*variant*/ ctx[25].id) > -1)) {
    				option.selected = option_selected_value;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (109:4) {#if icon }
    function create_if_block_4$2(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[5]);
    			attr(span, "class", "icon is-small is-left");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon*/ 32 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[5])) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (112:4) {#if validated === true }
    function create_if_block_1$4(ctx) {
    	let span;

    	function select_block_type_3(ctx, dirty) {
    		if (/*valid*/ ctx[10] === true) return create_if_block_2$2;
    		if (/*valid*/ ctx[10] === false) return create_if_block_3$2;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr(span, "class", "icon is-small is-right");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type_3(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};
    }

    // (116:35) 
    function create_if_block_3$2(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-exclamation-triangle");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (114:6) {#if valid === true }
    function create_if_block_2$2(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-check");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (125:4) {:else}
    function create_else_block$4(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (123:4) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$6(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[13]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 8192) set_data(t, /*helper*/ ctx[13]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let div1;
    	let div0;
    	let div0_class_value;
    	let t0;
    	let t1;
    	let div1_class_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let p_id_value;

    	function select_block_type(ctx, dirty) {
    		if (/*multiple*/ ctx[8]) return create_if_block_5;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*icon*/ ctx[5] && create_if_block_4$2(ctx);
    	let if_block2 = /*validated*/ ctx[11] === true && create_if_block_1$4(ctx);

    	function select_block_type_4(ctx, dirty) {
    		if (!(/*validated*/ ctx[11] && /*valid*/ ctx[10]) && /*inputStarted*/ ctx[0]) return create_if_block$6;
    		return create_else_block$4;
    	}

    	let current_block_type_1 = select_block_type_4(ctx);
    	let if_block3 = current_block_type_1(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			p = element("p");
    			if_block3.c();
    			attr(div0, "class", div0_class_value = "select " + /*validationClasses*/ ctx[14] + " " + /*multipleClass*/ ctx[15]);
    			attr(div1, "class", div1_class_value = "control " + /*iconClasses*/ ctx[12]);
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[14]);
    			attr(p, "id", p_id_value = "input-field-helper-" + /*fieldname*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			if_block0.m(div0, null);
    			append(div1, t0);
    			if (if_block1) if_block1.m(div1, null);
    			append(div1, t1);
    			if (if_block2) if_block2.m(div1, null);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			if_block3.m(p, null);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			}

    			if (dirty & /*validationClasses, multipleClass*/ 49152 && div0_class_value !== (div0_class_value = "select " + /*validationClasses*/ ctx[14] + " " + /*multipleClass*/ ctx[15])) {
    				attr(div0, "class", div0_class_value);
    			}

    			if (/*icon*/ ctx[5]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_4$2(ctx);
    					if_block1.c();
    					if_block1.m(div1, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*validated*/ ctx[11] === true) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$4(ctx);
    					if_block2.c();
    					if_block2.m(div1, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*iconClasses*/ 4096 && div1_class_value !== (div1_class_value = "control " + /*iconClasses*/ ctx[12])) {
    				attr(div1, "class", div1_class_value);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_4(ctx)) && if_block3) {
    				if_block3.p(ctx, dirty);
    			} else {
    				if_block3.d(1);
    				if_block3 = current_block_type_1(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 16384 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[14])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 16 && p_id_value !== (p_id_value = "input-field-helper-" + /*fieldname*/ ctx[4])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    			if_block3.d();
    		}
    	};
    }

    const CLEAR_MACRO = "__CLEAR__";

    function instance$9($$self, $$props, $$invalidate) {
    	let iconClasses;
    	let allErrors;
    	let helper;
    	let validationClasses;
    	let multipleClass;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = "" } = $$props;
    	let { variants = [] } = $$props;
    	let { placeholder = "empty select item" } = $$props;
    	let { fieldname = "select" } = $$props;
    	let { icon = false } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;
    	let { multiple = false } = $$props;
    	let { size = 8 } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		if (multiple) {
    			$$invalidate(1, value = Array.from(ev.target.selectedOptions).map(el => el.value));

    			if (value.indexOf(CLEAR_MACRO) > -1) {
    				$$invalidate(1, value = []);
    			}

    			data.value = value;
    		} else {
    			if (data.value === CLEAR_MACRO) {
    				$$invalidate(1, value = "");
    			}
    		}

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function onInput(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.value
    		};

    		if (multiple) {
    			$$invalidate(1, value = Array.from(ev.target.selectedOptions).map(el => el.value));

    			if (value.indexOf(CLEAR_MACRO) > -1) {
    				$$invalidate(1, value = []);
    			}

    			data.value = value;
    		} else {
    			if (data.value === CLEAR_MACRO) {
    				$$invalidate(1, value = "");
    			}
    		}

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function select_change_handler() {
    		value = select_value(this);
    		$$invalidate(1, value);
    		$$invalidate(2, variants);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("variants" in $$props) $$invalidate(2, variants = $$props.variants);
    		if ("placeholder" in $$props) $$invalidate(3, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(4, fieldname = $$props.fieldname);
    		if ("icon" in $$props) $$invalidate(5, icon = $$props.icon);
    		if ("required" in $$props) $$invalidate(6, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(7, readonly = $$props.readonly);
    		if ("multiple" in $$props) $$invalidate(8, multiple = $$props.multiple);
    		if ("size" in $$props) $$invalidate(9, size = $$props.size);
    		if ("valid" in $$props) $$invalidate(10, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(11, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(18, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(19, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(20, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 32) {
    			$$invalidate(12, iconClasses = (icon ? " has-icons-left " : "") + " has-icons-right ");
    		}

    		if ($$self.$$.dirty & /*errors, formErrors*/ 786432) {
    			$$invalidate(21, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 2097160) {
    			$$invalidate(13, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 1049600) ;

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 1025) {
    			$$invalidate(14, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}

    		if ($$self.$$.dirty & /*multiple*/ 256) {
    			$$invalidate(15, multipleClass = multiple ? " is-multiple " : "");
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		variants,
    		placeholder,
    		fieldname,
    		icon,
    		required,
    		readonly,
    		multiple,
    		size,
    		valid,
    		validated,
    		iconClasses,
    		helper,
    		validationClasses,
    		multipleClass,
    		onBlur,
    		onInput,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		select_change_handler
    	];
    }

    class Ui_select extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			variants: 2,
    			placeholder: 3,
    			fieldname: 4,
    			icon: 5,
    			required: 6,
    			readonly: 7,
    			multiple: 8,
    			size: 9,
    			valid: 10,
    			validated: 11,
    			errors: 18,
    			formErrors: 19,
    			formLevelError: 20
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.slider.svelte generated by Svelte v3.35.0 */

    class Ui_slider extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, null, safe_not_equal, {});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.switch.svelte generated by Svelte v3.35.0 */

    function create_else_block$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (68:4) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[11]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 2048) set_data(t, /*helper*/ ctx[11]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let div;
    	let input;
    	let input_class_value;
    	let input_id_value;
    	let input_aria_controls_value;
    	let input_aria_describedby_value;
    	let t0;
    	let label_1;
    	let t1;
    	let label_1_for_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let p_id_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (!(/*validated*/ ctx[10] && /*valid*/ ctx[8]) && /*inputStarted*/ ctx[0]) return create_if_block$5;
    		return create_else_block$3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			label_1 = element("label");
    			t1 = text(/*label*/ ctx[2]);
    			t2 = space();
    			p = element("p");
    			if_block.c();
    			attr(input, "type", "checkbox");
    			attr(input, "class", input_class_value = "switch " + /*styling*/ ctx[9]);
    			attr(input, "id", input_id_value = "form-field-switch-" + /*fieldname*/ ctx[4]);
    			attr(input, "placeholder", /*placeholder*/ ctx[3]);
    			attr(input, "name", /*fieldname*/ ctx[4]);
    			input.required = /*required*/ ctx[5];
    			input.readOnly = /*readonly*/ ctx[6];
    			attr(input, "invalid", /*invalid*/ ctx[12]);
    			attr(input, "aria-controls", input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[4]);
    			attr(input, "aria-describedby", input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[4]);
    			input.disabled = /*disabled*/ ctx[7];
    			attr(label_1, "class", "label");
    			attr(label_1, "for", label_1_for_value = "form-field-switch-" + /*fieldname*/ ctx[4]);
    			attr(div, "class", "control");
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[13]);
    			attr(p, "id", p_id_value = "form-field-helper-" + /*fieldname*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			input.checked = /*value*/ ctx[1];
    			append(div, t0);
    			append(div, label_1);
    			append(label_1, t1);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			if_block.m(p, null);

    			if (!mounted) {
    				dispose = [
    					listen(input, "change", /*input_change_handler*/ ctx[21]),
    					listen(input, "blur", /*onBlur*/ ctx[14]),
    					listen(input, "input", /*onInput*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*styling*/ 512 && input_class_value !== (input_class_value = "switch " + /*styling*/ ctx[9])) {
    				attr(input, "class", input_class_value);
    			}

    			if (dirty & /*fieldname*/ 16 && input_id_value !== (input_id_value = "form-field-switch-" + /*fieldname*/ ctx[4])) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*placeholder*/ 8) {
    				attr(input, "placeholder", /*placeholder*/ ctx[3]);
    			}

    			if (dirty & /*fieldname*/ 16) {
    				attr(input, "name", /*fieldname*/ ctx[4]);
    			}

    			if (dirty & /*required*/ 32) {
    				input.required = /*required*/ ctx[5];
    			}

    			if (dirty & /*readonly*/ 64) {
    				input.readOnly = /*readonly*/ ctx[6];
    			}

    			if (dirty & /*invalid*/ 4096) {
    				attr(input, "invalid", /*invalid*/ ctx[12]);
    			}

    			if (dirty & /*fieldname*/ 16 && input_aria_controls_value !== (input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[4])) {
    				attr(input, "aria-controls", input_aria_controls_value);
    			}

    			if (dirty & /*fieldname*/ 16 && input_aria_describedby_value !== (input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[4])) {
    				attr(input, "aria-describedby", input_aria_describedby_value);
    			}

    			if (dirty & /*disabled*/ 128) {
    				input.disabled = /*disabled*/ ctx[7];
    			}

    			if (dirty & /*value*/ 2) {
    				input.checked = /*value*/ ctx[1];
    			}

    			if (dirty & /*label*/ 4) set_data(t1, /*label*/ ctx[2]);

    			if (dirty & /*fieldname*/ 16 && label_1_for_value !== (label_1_for_value = "form-field-switch-" + /*fieldname*/ ctx[4])) {
    				attr(label_1, "for", label_1_for_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 8192 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[13])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 16 && p_id_value !== (p_id_value = "form-field-helper-" + /*fieldname*/ ctx[4])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let allErrors;
    	let helper;
    	let invalid;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = false } = $$props;
    	let { label = "textfield" } = $$props;
    	let { placeholder = "input some text here, please" } = $$props;
    	let { fieldname = "textfield" } = $$props;
    	let { icon = false } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;
    	let { disabled = false } = $$props;
    	let { valid = true } = $$props;
    	let { styling = " is-rounded is-success " } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.type === "checkbox"
    			? ev.currentTarget.checked
    			: value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function onInput(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.currentTarget.type === "checkbox"
    			? ev.currentTarget.checked
    			: value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function input_change_handler() {
    		value = this.checked;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("placeholder" in $$props) $$invalidate(3, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(4, fieldname = $$props.fieldname);
    		if ("icon" in $$props) $$invalidate(16, icon = $$props.icon);
    		if ("required" in $$props) $$invalidate(5, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(6, readonly = $$props.readonly);
    		if ("disabled" in $$props) $$invalidate(7, disabled = $$props.disabled);
    		if ("valid" in $$props) $$invalidate(8, valid = $$props.valid);
    		if ("styling" in $$props) $$invalidate(9, styling = $$props.styling);
    		if ("validated" in $$props) $$invalidate(10, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(17, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(18, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(19, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 65536) ;

    		if ($$self.$$.dirty & /*errors, formErrors*/ 393216) {
    			$$invalidate(20, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 1048584) {
    			$$invalidate(11, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 524544) {
    			$$invalidate(12, invalid = valid === false || formLevelError);
    		}

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 257) {
    			$$invalidate(13, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		label,
    		placeholder,
    		fieldname,
    		required,
    		readonly,
    		disabled,
    		valid,
    		styling,
    		validated,
    		helper,
    		invalid,
    		validationClasses,
    		onBlur,
    		onInput,
    		icon,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		input_change_handler
    	];
    }

    class Ui_switch extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			label: 2,
    			placeholder: 3,
    			fieldname: 4,
    			icon: 16,
    			required: 5,
    			readonly: 6,
    			disabled: 7,
    			valid: 8,
    			styling: 9,
    			validated: 10,
    			errors: 17,
    			formErrors: 18,
    			formLevelError: 19
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.tag.svelte generated by Svelte v3.35.0 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (56:6) {#if !readonly }
    function create_if_block_1$3(ctx) {
    	let button;
    	let button_data_id_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			attr(button, "data-id", button_data_id_value = /*item*/ ctx[12].id);
    			attr(button, "class", "delete is-small");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			if (!mounted) {
    				dispose = listen(button, "click", /*remove*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*items*/ 1 && button_data_id_value !== (button_data_id_value = /*item*/ ctx[12].id)) {
    				attr(button, "data-id", button_data_id_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (54:4) {#each items as item (item.id)}
    function create_each_block_1(key_1, ctx) {
    	let span;
    	let t0_value = /*item*/ ctx[12].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let span_class_value;
    	let if_block = !/*readonly*/ ctx[2] && create_if_block_1$3(ctx);

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			attr(span, "class", span_class_value = "mx-1 tag is-" + /*item*/ ctx[12].type);
    			this.first = span;
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t0);
    			append(span, t1);
    			if (if_block) if_block.m(span, null);
    			append(span, t2);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*items*/ 1 && t0_value !== (t0_value = /*item*/ ctx[12].title + "")) set_data(t0, t0_value);

    			if (!/*readonly*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$3(ctx);
    					if_block.c();
    					if_block.m(span, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*items*/ 1 && span_class_value !== (span_class_value = "mx-1 tag is-" + /*item*/ ctx[12].type)) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (62:2) {#if !readonly }
    function create_if_block$4(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let select;
    	let option;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;
    	let each_value = /*variants*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			select = element("select");
    			option = element("option");
    			option.textContent = "Выберите из списка...";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			button = element("button");
    			button.textContent = "Добавить";
    			option.__value = "-1";
    			option.value = option.__value;
    			option.selected = true;
    			attr(div0, "class", "select is-small");
    			attr(button, "class", "button is-primary is-small");
    			attr(div1, "class", "control");
    			attr(div2, "class", "column");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div1);
    			append(div1, div0);
    			append(div0, select);
    			append(select, option);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			append(div1, t1);
    			append(div1, button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*add*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*variants*/ 2) {
    				each_value = /*variants*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (68:10) {#each variants as variant}
    function create_each_block$2(ctx) {
    	let option;
    	let t_value = /*variant*/ ctx[9].title + "";
    	let t;
    	let option_value_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*variant*/ ctx[9].id;
    			option.value = option.__value;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*variants*/ 2 && t_value !== (t_value = /*variant*/ ctx[9].title + "")) set_data(t, t_value);

    			if (dirty & /*variants*/ 2 && option_value_value !== (option_value_value = /*variant*/ ctx[9].id)) {
    				option.__value = option_value_value;
    				option.value = option.__value;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	let div1;
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let div0_class_value;
    	let t;
    	let each_value_1 = /*items*/ ctx[0];
    	const get_key = ctx => /*item*/ ctx[12].id;

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	let if_block = !/*readonly*/ ctx[2] && create_if_block$4(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			attr(div0, "class", div0_class_value = "column " + /*classes*/ ctx[3]);
    			attr(div1, "class", "columns");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append(div1, t);
    			if (if_block) if_block.m(div1, null);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*items, remove, readonly*/ 21) {
    				each_value_1 = /*items*/ ctx[0];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div0, destroy_block, create_each_block_1, null, get_each_context_1);
    			}

    			if (dirty & /*classes*/ 8 && div0_class_value !== (div0_class_value = "column " + /*classes*/ ctx[3])) {
    				attr(div0, "class", div0_class_value);
    			}

    			if (!/*readonly*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let classes;
    	let dispatch = createEventDispatcher();
    	let { items = [] } = $$props;
    	let { variants = [] } = $$props;
    	let { error = false } = $$props;
    	let { readonly = false } = $$props;

    	let { beforeAdd = (item, list) => {
    		return true;
    	} } = $$props;

    	function remove(e) {
    		e && e.preventDefault();
    		let id = parseInt(e.currentTarget.dataset.id);
    		let item = items.find(el => el.id === id);

    		if (item) {
    			items.splice(items.indexOf(item), 1);
    			$$invalidate(0, items);
    			dispatch("change", items);
    		}

    		return false;
    	}

    	function add(e) {
    		e && e.preventDefault();
    		let id = parseInt(e.currentTarget.parentNode.querySelector("select").value);
    		let item = variants.find(el => el.id === id);

    		if (!beforeAdd(item, items)) {
    			return false;
    		}

    		if (item && items.indexOf(item) === -1) {
    			items.push(item);
    			$$invalidate(0, items);
    			dispatch("change", items);
    		}

    		return false;
    	}

    	$$self.$$set = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    		if ("variants" in $$props) $$invalidate(1, variants = $$props.variants);
    		if ("error" in $$props) $$invalidate(6, error = $$props.error);
    		if ("readonly" in $$props) $$invalidate(2, readonly = $$props.readonly);
    		if ("beforeAdd" in $$props) $$invalidate(7, beforeAdd = $$props.beforeAdd);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*error*/ 64) {
    			$$invalidate(3, classes = error ? "is-danger" : "");
    		}
    	};

    	return [items, variants, readonly, classes, remove, add, error, beforeAdd];
    }

    class Ui_tag extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			items: 0,
    			variants: 1,
    			error: 6,
    			readonly: 2,
    			beforeAdd: 7
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.telephone.svelte generated by Svelte v3.35.0 */

    function create_if_block_4$1(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[4]);
    			attr(span, "class", "icon is-small is-left");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon*/ 16 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[4])) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (74:4) {#if validated === true }
    function create_if_block_1$2(ctx) {
    	let span;

    	function select_block_type(ctx, dirty) {
    		if (/*valid*/ ctx[7] === true) return create_if_block_2$1;
    		if (/*valid*/ ctx[7] === false) return create_if_block_3$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr(span, "class", "icon is-small is-right");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};
    }

    // (78:35) 
    function create_if_block_3$1(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-exclamation-triangle");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (76:6) {#if valid === true }
    function create_if_block_2$1(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-check");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (87:4) {:else}
    function create_else_block$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (85:4) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 1024) set_data(t, /*helper*/ ctx[10]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let div;
    	let input;
    	let input_id_value;
    	let input_class_value;
    	let input_aria_controls_value;
    	let input_aria_describedby_value;
    	let t0;
    	let t1;
    	let div_class_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let p_id_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*icon*/ ctx[4] && create_if_block_4$1(ctx);
    	let if_block1 = /*validated*/ ctx[8] === true && create_if_block_1$2(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!(/*validated*/ ctx[8] && /*valid*/ ctx[7]) && /*inputStarted*/ ctx[0]) return create_if_block$3;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block2 = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			p = element("p");
    			if_block2.c();
    			attr(input, "id", input_id_value = "form-field-telephone-" + /*fieldname*/ ctx[3]);
    			attr(input, "class", input_class_value = "input " + /*validationClasses*/ ctx[12]);
    			attr(input, "type", "tel");
    			attr(input, "name", /*fieldname*/ ctx[3]);
    			attr(input, "invalid", /*invalid*/ ctx[11]);
    			input.required = /*required*/ ctx[5];
    			input.readOnly = /*readonly*/ ctx[6];
    			attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			attr(input, "aria-controls", input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(input, "aria-describedby", input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(div, "class", div_class_value = "control " + /*iconClasses*/ ctx[9]);
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[12]);
    			attr(p, "id", p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			set_input_value(input, /*value*/ ctx[1]);
    			append(div, t0);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			if_block2.m(p, null);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[19]),
    					listen(input, "change", /*onBlur*/ ctx[13]),
    					listen(input, "input", /*onInput*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*fieldname*/ 8 && input_id_value !== (input_id_value = "form-field-telephone-" + /*fieldname*/ ctx[3])) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*validationClasses*/ 4096 && input_class_value !== (input_class_value = "input " + /*validationClasses*/ ctx[12])) {
    				attr(input, "class", input_class_value);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "name", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*invalid*/ 2048) {
    				attr(input, "invalid", /*invalid*/ ctx[11]);
    			}

    			if (dirty & /*required*/ 32) {
    				input.required = /*required*/ ctx[5];
    			}

    			if (dirty & /*readonly*/ 64) {
    				input.readOnly = /*readonly*/ ctx[6];
    			}

    			if (dirty & /*placeholder*/ 4) {
    				attr(input, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(input, "autocomplete", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_controls_value !== (input_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-controls", input_aria_controls_value);
    			}

    			if (dirty & /*fieldname*/ 8 && input_aria_describedby_value !== (input_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(input, "aria-describedby", input_aria_describedby_value);
    			}

    			if (dirty & /*value*/ 2) {
    				set_input_value(input, /*value*/ ctx[1]);
    			}

    			if (/*icon*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$1(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*validated*/ ctx[8] === true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$2(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*iconClasses*/ 512 && div_class_value !== (div_class_value = "control " + /*iconClasses*/ ctx[9])) {
    				attr(div, "class", div_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 4096 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[12])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 8 && p_id_value !== (p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    			if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let iconClasses;
    	let allErrors;
    	let helper;
    	let invalid;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = "" } = $$props;
    	let { placeholder = "+7 (987) 654-32-10" } = $$props;
    	let { fieldname = "telephone" } = $$props;
    	let { icon = false } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		ev.preventDefault();
    		let val = UICommon.formatPhone(ev.currentTarget.value);
    		let data = { field: fieldname, value: val };
    		$$invalidate(1, value = val);
    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return false;
    	}

    	function onInput(ev) {
    		ev.preventDefault();
    		let val = UICommon.formatPhone(ev.currentTarget.value);
    		let data = { field: fieldname, value: val };
    		$$invalidate(1, value = val);
    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return false;
    	}

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(3, fieldname = $$props.fieldname);
    		if ("icon" in $$props) $$invalidate(4, icon = $$props.icon);
    		if ("required" in $$props) $$invalidate(5, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(6, readonly = $$props.readonly);
    		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(8, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(15, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(16, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(17, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 16) {
    			$$invalidate(9, iconClasses = (icon ? " has-icons-left " : "") + " has-icons-right ");
    		}

    		if ($$self.$$.dirty & /*errors, formErrors*/ 98304) {
    			$$invalidate(18, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 262148) {
    			$$invalidate(10, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 131200) {
    			$$invalidate(11, invalid = valid === false || formLevelError);
    		}

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 129) {
    			$$invalidate(12, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		placeholder,
    		fieldname,
    		icon,
    		required,
    		readonly,
    		valid,
    		validated,
    		iconClasses,
    		helper,
    		invalid,
    		validationClasses,
    		onBlur,
    		onInput,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		input_input_handler
    	];
    }

    class Ui_telephone extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			placeholder: 2,
    			fieldname: 3,
    			icon: 4,
    			required: 5,
    			readonly: 6,
    			valid: 7,
    			validated: 8,
    			errors: 15,
    			formErrors: 16,
    			formLevelError: 17
    		});
    	}
    }

    /* node_modules/not-bulma/src/form/ui.textarea.svelte generated by Svelte v3.35.0 */

    function create_if_block_4(ctx) {
    	let span;
    	let i;
    	let i_class_value;

    	return {
    		c() {
    			span = element("span");
    			i = element("i");
    			attr(i, "class", i_class_value = "fas fa-" + /*icon*/ ctx[4]);
    			attr(span, "class", "icon is-small is-left");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, i);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon*/ 16 && i_class_value !== (i_class_value = "fas fa-" + /*icon*/ ctx[4])) {
    				attr(i, "class", i_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (65:4) {#if validated === true }
    function create_if_block_1$1(ctx) {
    	let span;

    	function select_block_type(ctx, dirty) {
    		if (/*valid*/ ctx[8] === true) return create_if_block_2;
    		if (/*valid*/ ctx[8] === false) return create_if_block_3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr(span, "class", "icon is-small is-right");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};
    }

    // (69:35) 
    function create_if_block_3(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-exclamation-triangle");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (67:6) {#if valid === true }
    function create_if_block_2(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fas fa-check");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (78:4) {:else}
    function create_else_block$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(" ");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (76:4) {#if !(validated && valid) && (inputStarted) }
    function create_if_block$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*helper*/ ctx[11]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helper*/ 2048) set_data(t, /*helper*/ ctx[11]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div;
    	let textarea;
    	let textarea_id_value;
    	let textarea_class_value;
    	let textarea_aria_controls_value;
    	let textarea_aria_describedby_value;
    	let t0;
    	let t1;
    	let div_class_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let p_id_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*icon*/ ctx[4] && create_if_block_4(ctx);
    	let if_block1 = /*validated*/ ctx[9] === true && create_if_block_1$1(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!(/*validated*/ ctx[9] && /*valid*/ ctx[8]) && /*inputStarted*/ ctx[0]) return create_if_block$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block2 = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			textarea = element("textarea");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			p = element("p");
    			if_block2.c();
    			attr(textarea, "id", textarea_id_value = "form-field-textarea-" + /*fieldname*/ ctx[3]);
    			attr(textarea, "invalid", /*invalid*/ ctx[12]);
    			attr(textarea, "class", textarea_class_value = "textarea " + /*validationClasses*/ ctx[13]);
    			textarea.required = /*required*/ ctx[6];
    			textarea.readOnly = /*readonly*/ ctx[7];
    			attr(textarea, "name", /*fieldname*/ ctx[3]);
    			attr(textarea, "placeholder", /*placeholder*/ ctx[2]);
    			attr(textarea, "rows", /*rows*/ ctx[5]);
    			attr(textarea, "aria-controls", textarea_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(textarea, "aria-describedby", textarea_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    			attr(div, "class", div_class_value = "control " + /*iconClasses*/ ctx[10]);
    			attr(p, "class", p_class_value = "help " + /*validationClasses*/ ctx[13]);
    			attr(p, "id", p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, textarea);
    			set_input_value(textarea, /*value*/ ctx[1]);
    			append(div, t0);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			if_block2.m(p, null);

    			if (!mounted) {
    				dispose = [
    					listen(textarea, "blur", /*onBlur*/ ctx[14]),
    					listen(textarea, "input", /*textarea_input_handler*/ ctx[19])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*fieldname*/ 8 && textarea_id_value !== (textarea_id_value = "form-field-textarea-" + /*fieldname*/ ctx[3])) {
    				attr(textarea, "id", textarea_id_value);
    			}

    			if (dirty & /*invalid*/ 4096) {
    				attr(textarea, "invalid", /*invalid*/ ctx[12]);
    			}

    			if (dirty & /*validationClasses*/ 8192 && textarea_class_value !== (textarea_class_value = "textarea " + /*validationClasses*/ ctx[13])) {
    				attr(textarea, "class", textarea_class_value);
    			}

    			if (dirty & /*required*/ 64) {
    				textarea.required = /*required*/ ctx[6];
    			}

    			if (dirty & /*readonly*/ 128) {
    				textarea.readOnly = /*readonly*/ ctx[7];
    			}

    			if (dirty & /*fieldname*/ 8) {
    				attr(textarea, "name", /*fieldname*/ ctx[3]);
    			}

    			if (dirty & /*placeholder*/ 4) {
    				attr(textarea, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*rows*/ 32) {
    				attr(textarea, "rows", /*rows*/ ctx[5]);
    			}

    			if (dirty & /*fieldname*/ 8 && textarea_aria_controls_value !== (textarea_aria_controls_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(textarea, "aria-controls", textarea_aria_controls_value);
    			}

    			if (dirty & /*fieldname*/ 8 && textarea_aria_describedby_value !== (textarea_aria_describedby_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(textarea, "aria-describedby", textarea_aria_describedby_value);
    			}

    			if (dirty & /*value*/ 2) {
    				set_input_value(textarea, /*value*/ ctx[1]);
    			}

    			if (/*icon*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*validated*/ ctx[9] === true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*iconClasses*/ 1024 && div_class_value !== (div_class_value = "control " + /*iconClasses*/ ctx[10])) {
    				attr(div, "class", div_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(p, null);
    				}
    			}

    			if (dirty & /*validationClasses*/ 8192 && p_class_value !== (p_class_value = "help " + /*validationClasses*/ ctx[13])) {
    				attr(p, "class", p_class_value);
    			}

    			if (dirty & /*fieldname*/ 8 && p_id_value !== (p_id_value = "input-field-helper-" + /*fieldname*/ ctx[3])) {
    				attr(p, "id", p_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t2);
    			if (detaching) detach(p);
    			if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let iconClasses;
    	let allErrors;
    	let helper;
    	let invalid;
    	let validationClasses;
    	let dispatch = createEventDispatcher();
    	let { inputStarted = false } = $$props;
    	let { value = "" } = $$props;
    	let { placeholder = "input some text here, please" } = $$props;
    	let { fieldname = "textarea" } = $$props;
    	let { icon = false } = $$props;
    	let { rows = 10 } = $$props;
    	let { required = true } = $$props;
    	let { readonly = false } = $$props;
    	let { valid = true } = $$props;
    	let { validated = false } = $$props;
    	let { errors = false } = $$props;
    	let { formErrors = false } = $$props;
    	let { formLevelError = false } = $$props;

    	function onBlur(ev) {
    		let data = {
    			field: fieldname,
    			value: ev.target.type === "checkbox"
    			? ev.target.checked
    			: ev.target.value
    		};

    		$$invalidate(0, inputStarted = true);
    		dispatch("change", data);
    		return true;
    	}

    	function textarea_input_handler() {
    		value = this.value;
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ("inputStarted" in $$props) $$invalidate(0, inputStarted = $$props.inputStarted);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("fieldname" in $$props) $$invalidate(3, fieldname = $$props.fieldname);
    		if ("icon" in $$props) $$invalidate(4, icon = $$props.icon);
    		if ("rows" in $$props) $$invalidate(5, rows = $$props.rows);
    		if ("required" in $$props) $$invalidate(6, required = $$props.required);
    		if ("readonly" in $$props) $$invalidate(7, readonly = $$props.readonly);
    		if ("valid" in $$props) $$invalidate(8, valid = $$props.valid);
    		if ("validated" in $$props) $$invalidate(9, validated = $$props.validated);
    		if ("errors" in $$props) $$invalidate(15, errors = $$props.errors);
    		if ("formErrors" in $$props) $$invalidate(16, formErrors = $$props.formErrors);
    		if ("formLevelError" in $$props) $$invalidate(17, formLevelError = $$props.formLevelError);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*icon*/ 16) {
    			$$invalidate(10, iconClasses = (icon ? " has-icons-left " : "") + " has-icons-right ");
    		}

    		if ($$self.$$.dirty & /*errors, formErrors*/ 98304) {
    			$$invalidate(18, allErrors = [].concat(errors ? errors : [], formErrors ? formErrors : []));
    		}

    		if ($$self.$$.dirty & /*allErrors, placeholder*/ 262148) {
    			$$invalidate(11, helper = allErrors ? allErrors.join(", ") : placeholder);
    		}

    		if ($$self.$$.dirty & /*valid, formLevelError*/ 131328) {
    			$$invalidate(12, invalid = valid === false || formLevelError);
    		}

    		if ($$self.$$.dirty & /*valid, inputStarted*/ 257) {
    			$$invalidate(13, validationClasses = valid === true || !inputStarted
    			? UICommon.CLASS_OK
    			: UICommon.CLASS_ERR);
    		}
    	};

    	return [
    		inputStarted,
    		value,
    		placeholder,
    		fieldname,
    		icon,
    		rows,
    		required,
    		readonly,
    		valid,
    		validated,
    		iconClasses,
    		helper,
    		invalid,
    		validationClasses,
    		onBlur,
    		errors,
    		formErrors,
    		formLevelError,
    		allErrors,
    		textarea_input_handler
    	];
    }

    class Ui_textarea extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			inputStarted: 0,
    			value: 1,
    			placeholder: 2,
    			fieldname: 3,
    			icon: 4,
    			rows: 5,
    			required: 6,
    			readonly: 7,
    			valid: 8,
    			validated: 9,
    			errors: 15,
    			formErrors: 16,
    			formLevelError: 17
    		});
    	}
    }

    var FormElements = /*#__PURE__*/Object.freeze({
        __proto__: null,
        UIAutocomplete: Ui_autocomplete,
        UIForm: Form$1,
        UIField: Field,
        UILabel: Ui_label,
        UICheckbox: Ui_checkbox,
        UICheckboxList: Ui_checkbox_list,
        UIColor: Ui_color,
        UIDate: Ui_date,
        UIEmail: Ui_email,
        UIHidden: Ui_hidden,
        UIPassword: Ui_password,
        UIRadio: Ui_radio,
        UIRadiogroup: Ui_radiogroup,
        UIRange: Ui_range,
        UISelect: Ui_select,
        UISlider: Ui_slider,
        UISwitch: Ui_switch,
        UITagControl: Ui_tag,
        UITelephone: Ui_telephone,
        UITextarea: Ui_textarea,
        UITextfield: Ui_textfield
    });

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    var assertString_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = assertString;

    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    function assertString(input) {
      var isString = typeof input === 'string' || input instanceof String;

      if (!isString) {
        var invalidType = _typeof(input);

        if (input === null) invalidType = 'null';else if (invalidType === 'object') invalidType = input.constructor.name;
        throw new TypeError("Expected a string but received a ".concat(invalidType));
      }
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(assertString_1);

    var toDate_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = toDate;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function toDate(date) {
      (0, _assertString.default)(date);
      date = Date.parse(date);
      return !isNaN(date) ? new Date(date) : null;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(toDate_1);

    var alpha_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.commaDecimal = exports.dotDecimal = exports.farsiLocales = exports.arabicLocales = exports.englishLocales = exports.decimal = exports.alphanumeric = exports.alpha = void 0;
    var alpha = {
      'en-US': /^[A-Z]+$/i,
      'az-AZ': /^[A-VXYZÇƏĞİıÖŞÜ]+$/i,
      'bg-BG': /^[А-Я]+$/i,
      'cs-CZ': /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]+$/i,
      'da-DK': /^[A-ZÆØÅ]+$/i,
      'de-DE': /^[A-ZÄÖÜß]+$/i,
      'el-GR': /^[Α-ώ]+$/i,
      'es-ES': /^[A-ZÁÉÍÑÓÚÜ]+$/i,
      'fa-IR': /^[ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]+$/i,
      'fr-FR': /^[A-ZÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ]+$/i,
      'it-IT': /^[A-ZÀÉÈÌÎÓÒÙ]+$/i,
      'nb-NO': /^[A-ZÆØÅ]+$/i,
      'nl-NL': /^[A-ZÁÉËÏÓÖÜÚ]+$/i,
      'nn-NO': /^[A-ZÆØÅ]+$/i,
      'hu-HU': /^[A-ZÁÉÍÓÖŐÚÜŰ]+$/i,
      'pl-PL': /^[A-ZĄĆĘŚŁŃÓŻŹ]+$/i,
      'pt-PT': /^[A-ZÃÁÀÂÄÇÉÊËÍÏÕÓÔÖÚÜ]+$/i,
      'ru-RU': /^[А-ЯЁ]+$/i,
      'sl-SI': /^[A-ZČĆĐŠŽ]+$/i,
      'sk-SK': /^[A-ZÁČĎÉÍŇÓŠŤÚÝŽĹŔĽÄÔ]+$/i,
      'sr-RS@latin': /^[A-ZČĆŽŠĐ]+$/i,
      'sr-RS': /^[А-ЯЂЈЉЊЋЏ]+$/i,
      'sv-SE': /^[A-ZÅÄÖ]+$/i,
      'th-TH': /^[ก-๐\s]+$/i,
      'tr-TR': /^[A-ZÇĞİıÖŞÜ]+$/i,
      'uk-UA': /^[А-ЩЬЮЯЄIЇҐі]+$/i,
      'vi-VN': /^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴĐÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸ]+$/i,
      'ku-IQ': /^[ئابپتجچحخدرڕزژسشعغفڤقکگلڵمنوۆھەیێيطؤثآإأكضصةظذ]+$/i,
      ar: /^[ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰ]+$/,
      he: /^[א-ת]+$/,
      fa: /^['آاءأؤئبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهةی']+$/i
    };
    exports.alpha = alpha;
    var alphanumeric = {
      'en-US': /^[0-9A-Z]+$/i,
      'az-AZ': /^[0-9A-VXYZÇƏĞİıÖŞÜ]+$/i,
      'bg-BG': /^[0-9А-Я]+$/i,
      'cs-CZ': /^[0-9A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]+$/i,
      'da-DK': /^[0-9A-ZÆØÅ]+$/i,
      'de-DE': /^[0-9A-ZÄÖÜß]+$/i,
      'el-GR': /^[0-9Α-ω]+$/i,
      'es-ES': /^[0-9A-ZÁÉÍÑÓÚÜ]+$/i,
      'fr-FR': /^[0-9A-ZÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ]+$/i,
      'it-IT': /^[0-9A-ZÀÉÈÌÎÓÒÙ]+$/i,
      'hu-HU': /^[0-9A-ZÁÉÍÓÖŐÚÜŰ]+$/i,
      'nb-NO': /^[0-9A-ZÆØÅ]+$/i,
      'nl-NL': /^[0-9A-ZÁÉËÏÓÖÜÚ]+$/i,
      'nn-NO': /^[0-9A-ZÆØÅ]+$/i,
      'pl-PL': /^[0-9A-ZĄĆĘŚŁŃÓŻŹ]+$/i,
      'pt-PT': /^[0-9A-ZÃÁÀÂÄÇÉÊËÍÏÕÓÔÖÚÜ]+$/i,
      'ru-RU': /^[0-9А-ЯЁ]+$/i,
      'sl-SI': /^[0-9A-ZČĆĐŠŽ]+$/i,
      'sk-SK': /^[0-9A-ZÁČĎÉÍŇÓŠŤÚÝŽĹŔĽÄÔ]+$/i,
      'sr-RS@latin': /^[0-9A-ZČĆŽŠĐ]+$/i,
      'sr-RS': /^[0-9А-ЯЂЈЉЊЋЏ]+$/i,
      'sv-SE': /^[0-9A-ZÅÄÖ]+$/i,
      'th-TH': /^[ก-๙\s]+$/i,
      'tr-TR': /^[0-9A-ZÇĞİıÖŞÜ]+$/i,
      'uk-UA': /^[0-9А-ЩЬЮЯЄIЇҐі]+$/i,
      'ku-IQ': /^[٠١٢٣٤٥٦٧٨٩0-9ئابپتجچحخدرڕزژسشعغفڤقکگلڵمنوۆھەیێيطؤثآإأكضصةظذ]+$/i,
      'vi-VN': /^[0-9A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴĐÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸ]+$/i,
      ar: /^[٠١٢٣٤٥٦٧٨٩0-9ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰ]+$/,
      he: /^[0-9א-ת]+$/,
      fa: /^['0-9آاءأؤئبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهةی۱۲۳۴۵۶۷۸۹۰']+$/i
    };
    exports.alphanumeric = alphanumeric;
    var decimal = {
      'en-US': '.',
      ar: '٫'
    };
    exports.decimal = decimal;
    var englishLocales = ['AU', 'GB', 'HK', 'IN', 'NZ', 'ZA', 'ZM'];
    exports.englishLocales = englishLocales;

    for (var locale, i = 0; i < englishLocales.length; i++) {
      locale = "en-".concat(englishLocales[i]);
      alpha[locale] = alpha['en-US'];
      alphanumeric[locale] = alphanumeric['en-US'];
      decimal[locale] = decimal['en-US'];
    } // Source: http://www.localeplanet.com/java/


    var arabicLocales = ['AE', 'BH', 'DZ', 'EG', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MA', 'QM', 'QA', 'SA', 'SD', 'SY', 'TN', 'YE'];
    exports.arabicLocales = arabicLocales;

    for (var _locale, _i = 0; _i < arabicLocales.length; _i++) {
      _locale = "ar-".concat(arabicLocales[_i]);
      alpha[_locale] = alpha.ar;
      alphanumeric[_locale] = alphanumeric.ar;
      decimal[_locale] = decimal.ar;
    }

    var farsiLocales = ['IR', 'AF'];
    exports.farsiLocales = farsiLocales;

    for (var _locale2, _i2 = 0; _i2 < farsiLocales.length; _i2++) {
      _locale2 = "fa-".concat(farsiLocales[_i2]);
      alphanumeric[_locale2] = alphanumeric.fa;
      decimal[_locale2] = decimal.ar;
    } // Source: https://en.wikipedia.org/wiki/Decimal_mark


    var dotDecimal = ['ar-EG', 'ar-LB', 'ar-LY'];
    exports.dotDecimal = dotDecimal;
    var commaDecimal = ['bg-BG', 'cs-CZ', 'da-DK', 'de-DE', 'el-GR', 'en-ZM', 'es-ES', 'fr-CA', 'fr-FR', 'id-ID', 'it-IT', 'ku-IQ', 'hu-HU', 'nb-NO', 'nn-NO', 'nl-NL', 'pl-PL', 'pt-PT', 'ru-RU', 'sl-SI', 'sr-RS@latin', 'sr-RS', 'sv-SE', 'tr-TR', 'uk-UA', 'vi-VN'];
    exports.commaDecimal = commaDecimal;

    for (var _i3 = 0; _i3 < dotDecimal.length; _i3++) {
      decimal[dotDecimal[_i3]] = decimal['en-US'];
    }

    for (var _i4 = 0; _i4 < commaDecimal.length; _i4++) {
      decimal[commaDecimal[_i4]] = ',';
    }

    alpha['fr-CA'] = alpha['fr-FR'];
    alphanumeric['fr-CA'] = alphanumeric['fr-FR'];
    alpha['pt-BR'] = alpha['pt-PT'];
    alphanumeric['pt-BR'] = alphanumeric['pt-PT'];
    decimal['pt-BR'] = decimal['pt-PT']; // see #862

    alpha['pl-Pl'] = alpha['pl-PL'];
    alphanumeric['pl-Pl'] = alphanumeric['pl-PL'];
    decimal['pl-Pl'] = decimal['pl-PL']; // see #1455

    alpha['fa-AF'] = alpha.fa;
    });

    unwrapExports(alpha_1);
    alpha_1.commaDecimal;
    alpha_1.dotDecimal;
    alpha_1.farsiLocales;
    alpha_1.arabicLocales;
    alpha_1.englishLocales;
    alpha_1.decimal;
    alpha_1.alphanumeric;
    alpha_1.alpha;

    var isFloat_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isFloat;
    exports.locales = void 0;

    var _assertString = _interopRequireDefault(assertString_1);



    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isFloat(str, options) {
      (0, _assertString.default)(str);
      options = options || {};
      var float = new RegExp("^(?:[-+])?(?:[0-9]+)?(?:\\".concat(options.locale ? alpha_1.decimal[options.locale] : '.', "[0-9]*)?(?:[eE][\\+\\-]?(?:[0-9]+))?$"));

      if (str === '' || str === '.' || str === '-' || str === '+') {
        return false;
      }

      var value = parseFloat(str.replace(',', '.'));
      return float.test(str) && (!options.hasOwnProperty('min') || value >= options.min) && (!options.hasOwnProperty('max') || value <= options.max) && (!options.hasOwnProperty('lt') || value < options.lt) && (!options.hasOwnProperty('gt') || value > options.gt);
    }

    var locales = Object.keys(alpha_1.decimal);
    exports.locales = locales;
    });

    unwrapExports(isFloat_1);
    isFloat_1.locales;

    var toFloat_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = toFloat;

    var _isFloat = _interopRequireDefault(isFloat_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function toFloat(str) {
      if (!(0, _isFloat.default)(str)) return NaN;
      return parseFloat(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(toFloat_1);

    var toInt_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = toInt;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function toInt(str, radix) {
      (0, _assertString.default)(str);
      return parseInt(str, radix || 10);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(toInt_1);

    var toBoolean_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = toBoolean;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function toBoolean(str, strict) {
      (0, _assertString.default)(str);

      if (strict) {
        return str === '1' || /^true$/i.test(str);
      }

      return str !== '0' && !/^false$/i.test(str) && str !== '';
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(toBoolean_1);

    var equals_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = equals;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function equals(str, comparison) {
      (0, _assertString.default)(str);
      return str === comparison;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(equals_1);

    var toString_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = toString;

    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    function toString(input) {
      if (_typeof(input) === 'object' && input !== null) {
        if (typeof input.toString === 'function') {
          input = input.toString();
        } else {
          input = '[object Object]';
        }
      } else if (input === null || typeof input === 'undefined' || isNaN(input) && !input.length) {
        input = '';
      }

      return String(input);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(toString_1);

    var merge_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = merge;

    function merge() {
      var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var defaults = arguments.length > 1 ? arguments[1] : undefined;

      for (var key in defaults) {
        if (typeof obj[key] === 'undefined') {
          obj[key] = defaults[key];
        }
      }

      return obj;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(merge_1);

    var contains_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = contains;

    var _assertString = _interopRequireDefault(assertString_1);

    var _toString = _interopRequireDefault(toString_1);

    var _merge = _interopRequireDefault(merge_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var defaulContainsOptions = {
      ignoreCase: false
    };

    function contains(str, elem, options) {
      (0, _assertString.default)(str);
      options = (0, _merge.default)(options, defaulContainsOptions);
      return options.ignoreCase ? str.toLowerCase().indexOf((0, _toString.default)(elem).toLowerCase()) >= 0 : str.indexOf((0, _toString.default)(elem)) >= 0;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(contains_1);

    var matches_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = matches;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function matches(str, pattern, modifiers) {
      (0, _assertString.default)(str);

      if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
        pattern = new RegExp(pattern, modifiers);
      }

      return pattern.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(matches_1);

    var isByteLength_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isByteLength;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    /* eslint-disable prefer-rest-params */
    function isByteLength(str, options) {
      (0, _assertString.default)(str);
      var min;
      var max;

      if (_typeof(options) === 'object') {
        min = options.min || 0;
        max = options.max;
      } else {
        // backwards compatibility: isByteLength(str, min [, max])
        min = arguments[1];
        max = arguments[2];
      }

      var len = encodeURI(str).split(/%..|./).length - 1;
      return len >= min && (typeof max === 'undefined' || len <= max);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isByteLength_1);

    var isFQDN_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isFQDN;

    var _assertString = _interopRequireDefault(assertString_1);

    var _merge = _interopRequireDefault(merge_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var default_fqdn_options = {
      require_tld: true,
      allow_underscores: false,
      allow_trailing_dot: false,
      allow_numeric_tld: false
    };

    function isFQDN(str, options) {
      (0, _assertString.default)(str);
      options = (0, _merge.default)(options, default_fqdn_options);
      /* Remove the optional trailing dot before checking validity */

      if (options.allow_trailing_dot && str[str.length - 1] === '.') {
        str = str.substring(0, str.length - 1);
      }

      var parts = str.split('.');
      var tld = parts[parts.length - 1];

      if (options.require_tld) {
        // disallow fqdns without tld
        if (parts.length < 2) {
          return false;
        }

        if (!/^([a-z\u00a1-\uffff]{2,}|xn[a-z0-9-]{2,})$/i.test(tld)) {
          return false;
        } // disallow spaces && special characers


        if (/[\s\u2002-\u200B\u202F\u205F\u3000\uFEFF\uDB40\uDC20\u00A9\uFFFD]/.test(tld)) {
          return false;
        }
      } // reject numeric TLDs


      if (!options.allow_numeric_tld && /^\d+$/.test(tld)) {
        return false;
      }

      return parts.every(function (part) {
        if (part.length > 63) {
          return false;
        }

        if (!/^[a-z_\u00a1-\uffff0-9-]+$/i.test(part)) {
          return false;
        } // disallow full-width chars


        if (/[\uff01-\uff5e]/.test(part)) {
          return false;
        } // disallow parts starting or ending with hyphen


        if (/^-|-$/.test(part)) {
          return false;
        }

        if (!options.allow_underscores && /_/.test(part)) {
          return false;
        }

        return true;
      });
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isFQDN_1);

    var isIP_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isIP;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
    11.3.  Examples

       The following addresses

                 fe80::1234 (on the 1st link of the node)
                 ff02::5678 (on the 5th link of the node)
                 ff08::9abc (on the 10th organization of the node)

       would be represented as follows:

                 fe80::1234%1
                 ff02::5678%5
                 ff08::9abc%10

       (Here we assume a natural translation from a zone index to the
       <zone_id> part, where the Nth zone of any scope is translated into
       "N".)

       If we use interface names as <zone_id>, those addresses could also be
       represented as follows:

                fe80::1234%ne0
                ff02::5678%pvc1.3
                ff08::9abc%interface10

       where the interface "ne0" belongs to the 1st link, "pvc1.3" belongs
       to the 5th link, and "interface10" belongs to the 10th organization.
     * * */
    var ipv4Maybe = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    var ipv6Block = /^[0-9A-F]{1,4}$/i;

    function isIP(str) {
      var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      (0, _assertString.default)(str);
      version = String(version);

      if (!version) {
        return isIP(str, 4) || isIP(str, 6);
      } else if (version === '4') {
        if (!ipv4Maybe.test(str)) {
          return false;
        }

        var parts = str.split('.').sort(function (a, b) {
          return a - b;
        });
        return parts[3] <= 255;
      } else if (version === '6') {
        var addressAndZone = [str]; // ipv6 addresses could have scoped architecture
        // according to https://tools.ietf.org/html/rfc4007#section-11

        if (str.includes('%')) {
          addressAndZone = str.split('%');

          if (addressAndZone.length !== 2) {
            // it must be just two parts
            return false;
          }

          if (!addressAndZone[0].includes(':')) {
            // the first part must be the address
            return false;
          }

          if (addressAndZone[1] === '') {
            // the second part must not be empty
            return false;
          }
        }

        var blocks = addressAndZone[0].split(':');
        var foundOmissionBlock = false; // marker to indicate ::
        // At least some OS accept the last 32 bits of an IPv6 address
        // (i.e. 2 of the blocks) in IPv4 notation, and RFC 3493 says
        // that '::ffff:a.b.c.d' is valid for IPv4-mapped IPv6 addresses,
        // and '::a.b.c.d' is deprecated, but also valid.

        var foundIPv4TransitionBlock = isIP(blocks[blocks.length - 1], 4);
        var expectedNumberOfBlocks = foundIPv4TransitionBlock ? 7 : 8;

        if (blocks.length > expectedNumberOfBlocks) {
          return false;
        } // initial or final ::


        if (str === '::') {
          return true;
        } else if (str.substr(0, 2) === '::') {
          blocks.shift();
          blocks.shift();
          foundOmissionBlock = true;
        } else if (str.substr(str.length - 2) === '::') {
          blocks.pop();
          blocks.pop();
          foundOmissionBlock = true;
        }

        for (var i = 0; i < blocks.length; ++i) {
          // test for a :: which can not be at the string start/end
          // since those cases have been handled above
          if (blocks[i] === '' && i > 0 && i < blocks.length - 1) {
            if (foundOmissionBlock) {
              return false; // multiple :: in address
            }

            foundOmissionBlock = true;
          } else if (foundIPv4TransitionBlock && i === blocks.length - 1) ; else if (!ipv6Block.test(blocks[i])) {
            return false;
          }
        }

        if (foundOmissionBlock) {
          return blocks.length >= 1;
        }

        return blocks.length === expectedNumberOfBlocks;
      }

      return false;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isIP_1);

    var isEmail_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isEmail;

    var _assertString = _interopRequireDefault(assertString_1);

    var _merge = _interopRequireDefault(merge_1);

    var _isByteLength = _interopRequireDefault(isByteLength_1);

    var _isFQDN = _interopRequireDefault(isFQDN_1);

    var _isIP = _interopRequireDefault(isIP_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

    function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

    function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

    var default_email_options = {
      allow_display_name: false,
      require_display_name: false,
      allow_utf8_local_part: true,
      require_tld: true,
      blacklisted_chars: '',
      ignore_max_length: false
    };
    /* eslint-disable max-len */

    /* eslint-disable no-control-regex */

    var splitNameAddress = /^([^\x00-\x1F\x7F-\x9F\cX]+)<(.+)>$/i;
    var emailUserPart = /^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~]+$/i;
    var gmailUserPart = /^[a-z\d]+$/;
    var quotedEmailUser = /^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f]))*$/i;
    var emailUserUtf8Part = /^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/i;
    var quotedEmailUserUtf8 = /^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*$/i;
    var defaultMaxEmailLength = 254;
    /* eslint-enable max-len */

    /* eslint-enable no-control-regex */

    /**
     * Validate display name according to the RFC2822: https://tools.ietf.org/html/rfc2822#appendix-A.1.2
     * @param {String} display_name
     */

    function validateDisplayName(display_name) {
      var trim_quotes = display_name.match(/^"(.+)"$/i);
      var display_name_without_quotes = trim_quotes ? trim_quotes[1] : display_name; // display name with only spaces is not valid

      if (!display_name_without_quotes.trim()) {
        return false;
      } // check whether display name contains illegal character


      var contains_illegal = /[\.";<>]/.test(display_name_without_quotes);

      if (contains_illegal) {
        // if contains illegal characters,
        // must to be enclosed in double-quotes, otherwise it's not a valid display name
        if (!trim_quotes) {
          return false;
        } // the quotes in display name must start with character symbol \


        var all_start_with_back_slash = display_name_without_quotes.split('"').length === display_name_without_quotes.split('\\"').length;

        if (!all_start_with_back_slash) {
          return false;
        }
      }

      return true;
    }

    function isEmail(str, options) {
      (0, _assertString.default)(str);
      options = (0, _merge.default)(options, default_email_options);

      if (options.require_display_name || options.allow_display_name) {
        var display_email = str.match(splitNameAddress);

        if (display_email) {
          var display_name;

          var _display_email = _slicedToArray(display_email, 3);

          display_name = _display_email[1];
          str = _display_email[2];

          // sometimes need to trim the last space to get the display name
          // because there may be a space between display name and email address
          // eg. myname <address@gmail.com>
          // the display name is `myname` instead of `myname `, so need to trim the last space
          if (display_name.endsWith(' ')) {
            display_name = display_name.substr(0, display_name.length - 1);
          }

          if (!validateDisplayName(display_name)) {
            return false;
          }
        } else if (options.require_display_name) {
          return false;
        }
      }

      if (!options.ignore_max_length && str.length > defaultMaxEmailLength) {
        return false;
      }

      var parts = str.split('@');
      var domain = parts.pop();
      var user = parts.join('@');
      var lower_domain = domain.toLowerCase();

      if (options.domain_specific_validation && (lower_domain === 'gmail.com' || lower_domain === 'googlemail.com')) {
        /*
          Previously we removed dots for gmail addresses before validating.
          This was removed because it allows `multiple..dots@gmail.com`
          to be reported as valid, but it is not.
          Gmail only normalizes single dots, removing them from here is pointless,
          should be done in normalizeEmail
        */
        user = user.toLowerCase(); // Removing sub-address from username before gmail validation

        var username = user.split('+')[0]; // Dots are not included in gmail length restriction

        if (!(0, _isByteLength.default)(username.replace('.', ''), {
          min: 6,
          max: 30
        })) {
          return false;
        }

        var _user_parts = username.split('.');

        for (var i = 0; i < _user_parts.length; i++) {
          if (!gmailUserPart.test(_user_parts[i])) {
            return false;
          }
        }
      }

      if (options.ignore_max_length === false && (!(0, _isByteLength.default)(user, {
        max: 64
      }) || !(0, _isByteLength.default)(domain, {
        max: 254
      }))) {
        return false;
      }

      if (!(0, _isFQDN.default)(domain, {
        require_tld: options.require_tld
      })) {
        if (!options.allow_ip_domain) {
          return false;
        }

        if (!(0, _isIP.default)(domain)) {
          if (!domain.startsWith('[') || !domain.endsWith(']')) {
            return false;
          }

          var noBracketdomain = domain.substr(1, domain.length - 2);

          if (noBracketdomain.length === 0 || !(0, _isIP.default)(noBracketdomain)) {
            return false;
          }
        }
      }

      if (user[0] === '"') {
        user = user.slice(1, user.length - 1);
        return options.allow_utf8_local_part ? quotedEmailUserUtf8.test(user) : quotedEmailUser.test(user);
      }

      var pattern = options.allow_utf8_local_part ? emailUserUtf8Part : emailUserPart;
      var user_parts = user.split('.');

      for (var _i2 = 0; _i2 < user_parts.length; _i2++) {
        if (!pattern.test(user_parts[_i2])) {
          return false;
        }
      }

      if (options.blacklisted_chars) {
        if (user.search(new RegExp("[".concat(options.blacklisted_chars, "]+"), 'g')) !== -1) return false;
      }

      return true;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isEmail_1);

    var isURL_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isURL;

    var _assertString = _interopRequireDefault(assertString_1);

    var _isFQDN = _interopRequireDefault(isFQDN_1);

    var _isIP = _interopRequireDefault(isIP_1);

    var _merge = _interopRequireDefault(merge_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /*
    options for isURL method

    require_protocol - if set as true isURL will return false if protocol is not present in the URL
    require_valid_protocol - isURL will check if the URL's protocol is present in the protocols option
    protocols - valid protocols can be modified with this option
    require_host - if set as false isURL will not check if host is present in the URL
    require_port - if set as true isURL will check if port is present in the URL
    allow_protocol_relative_urls - if set as true protocol relative URLs will be allowed
    validate_length - if set as false isURL will skip string length validation (IE maximum is 2083)

    */
    var default_url_options = {
      protocols: ['http', 'https', 'ftp'],
      require_tld: true,
      require_protocol: false,
      require_host: true,
      require_port: false,
      require_valid_protocol: true,
      allow_underscores: false,
      allow_trailing_dot: false,
      allow_protocol_relative_urls: false,
      validate_length: true
    };
    var wrapped_ipv6 = /^\[([^\]]+)\](?::([0-9]+))?$/;

    function isRegExp(obj) {
      return Object.prototype.toString.call(obj) === '[object RegExp]';
    }

    function checkHost(host, matches) {
      for (var i = 0; i < matches.length; i++) {
        var match = matches[i];

        if (host === match || isRegExp(match) && match.test(host)) {
          return true;
        }
      }

      return false;
    }

    function isURL(url, options) {
      (0, _assertString.default)(url);

      if (!url || /[\s<>]/.test(url)) {
        return false;
      }

      if (url.indexOf('mailto:') === 0) {
        return false;
      }

      options = (0, _merge.default)(options, default_url_options);

      if (options.validate_length && url.length >= 2083) {
        return false;
      }

      var protocol, auth, host, hostname, port, port_str, split, ipv6;
      split = url.split('#');
      url = split.shift();
      split = url.split('?');
      url = split.shift();
      split = url.split('://');

      if (split.length > 1) {
        protocol = split.shift().toLowerCase();

        if (options.require_valid_protocol && options.protocols.indexOf(protocol) === -1) {
          return false;
        }
      } else if (options.require_protocol) {
        return false;
      } else if (url.substr(0, 2) === '//') {
        if (!options.allow_protocol_relative_urls) {
          return false;
        }

        split[0] = url.substr(2);
      }

      url = split.join('://');

      if (url === '') {
        return false;
      }

      split = url.split('/');
      url = split.shift();

      if (url === '' && !options.require_host) {
        return true;
      }

      split = url.split('@');

      if (split.length > 1) {
        if (options.disallow_auth) {
          return false;
        }

        auth = split.shift();

        if (auth.indexOf(':') === -1 || auth.indexOf(':') >= 0 && auth.split(':').length > 2) {
          return false;
        }
      }

      hostname = split.join('@');
      port_str = null;
      ipv6 = null;
      var ipv6_match = hostname.match(wrapped_ipv6);

      if (ipv6_match) {
        host = '';
        ipv6 = ipv6_match[1];
        port_str = ipv6_match[2] || null;
      } else {
        split = hostname.split(':');
        host = split.shift();

        if (split.length) {
          port_str = split.join(':');
        }
      }

      if (port_str !== null) {
        port = parseInt(port_str, 10);

        if (!/^[0-9]+$/.test(port_str) || port <= 0 || port > 65535) {
          return false;
        }
      } else if (options.require_port) {
        return false;
      }

      if (!(0, _isIP.default)(host) && !(0, _isFQDN.default)(host, options) && (!ipv6 || !(0, _isIP.default)(ipv6, 6))) {
        return false;
      }

      host = host || ipv6;

      if (options.host_whitelist && !checkHost(host, options.host_whitelist)) {
        return false;
      }

      if (options.host_blacklist && checkHost(host, options.host_blacklist)) {
        return false;
      }

      return true;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isURL_1);

    var isMACAddress_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isMACAddress;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var macAddress = /^([0-9a-fA-F][0-9a-fA-F]:){5}([0-9a-fA-F][0-9a-fA-F])$/;
    var macAddressNoColons = /^([0-9a-fA-F]){12}$/;
    var macAddressWithHyphen = /^([0-9a-fA-F][0-9a-fA-F]-){5}([0-9a-fA-F][0-9a-fA-F])$/;
    var macAddressWithSpaces = /^([0-9a-fA-F][0-9a-fA-F]\s){5}([0-9a-fA-F][0-9a-fA-F])$/;
    var macAddressWithDots = /^([0-9a-fA-F]{4}).([0-9a-fA-F]{4}).([0-9a-fA-F]{4})$/;

    function isMACAddress(str, options) {
      (0, _assertString.default)(str);

      if (options && options.no_colons) {
        return macAddressNoColons.test(str);
      }

      return macAddress.test(str) || macAddressWithHyphen.test(str) || macAddressWithSpaces.test(str) || macAddressWithDots.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isMACAddress_1);

    var isIPRange_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isIPRange;

    var _assertString = _interopRequireDefault(assertString_1);

    var _isIP = _interopRequireDefault(isIP_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var subnetMaybe = /^\d{1,2}$/;

    function isIPRange(str) {
      (0, _assertString.default)(str);
      var parts = str.split('/'); // parts[0] -> ip, parts[1] -> subnet

      if (parts.length !== 2) {
        return false;
      }

      if (!subnetMaybe.test(parts[1])) {
        return false;
      } // Disallow preceding 0 i.e. 01, 02, ...


      if (parts[1].length > 1 && parts[1].startsWith('0')) {
        return false;
      }

      return (0, _isIP.default)(parts[0], 4) && parts[1] <= 32 && parts[1] >= 0;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isIPRange_1);

    var isDate_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isDate;

    var _merge = _interopRequireDefault(merge_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

    function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

    function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

    function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

    function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    var default_date_options = {
      format: 'YYYY/MM/DD',
      delimiters: ['/', '-'],
      strictMode: false
    };

    function isValidFormat(format) {
      return /(^(y{4}|y{2})[\/-](m{1,2})[\/-](d{1,2})$)|(^(m{1,2})[\/-](d{1,2})[\/-]((y{4}|y{2})$))|(^(d{1,2})[\/-](m{1,2})[\/-]((y{4}|y{2})$))/gi.test(format);
    }

    function zip(date, format) {
      var zippedArr = [],
          len = Math.min(date.length, format.length);

      for (var i = 0; i < len; i++) {
        zippedArr.push([date[i], format[i]]);
      }

      return zippedArr;
    }

    function isDate(input, options) {
      if (typeof options === 'string') {
        // Allow backward compatbility for old format isDate(input [, format])
        options = (0, _merge.default)({
          format: options
        }, default_date_options);
      } else {
        options = (0, _merge.default)(options, default_date_options);
      }

      if (typeof input === 'string' && isValidFormat(options.format)) {
        var formatDelimiter = options.delimiters.find(function (delimiter) {
          return options.format.indexOf(delimiter) !== -1;
        });
        var dateDelimiter = options.strictMode ? formatDelimiter : options.delimiters.find(function (delimiter) {
          return input.indexOf(delimiter) !== -1;
        });
        var dateAndFormat = zip(input.split(dateDelimiter), options.format.toLowerCase().split(formatDelimiter));
        var dateObj = {};

        var _iterator = _createForOfIteratorHelper(dateAndFormat),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var _step$value = _slicedToArray(_step.value, 2),
                dateWord = _step$value[0],
                formatWord = _step$value[1];

            if (dateWord.length !== formatWord.length) {
              return false;
            }

            dateObj[formatWord.charAt(0)] = dateWord;
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }

        return new Date("".concat(dateObj.m, "/").concat(dateObj.d, "/").concat(dateObj.y)).getDate() === +dateObj.d;
      }

      if (!options.strictMode) {
        return Object.prototype.toString.call(input) === '[object Date]' && isFinite(input);
      }

      return false;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isDate_1);

    var isBoolean_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isBoolean;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isBoolean(str) {
      (0, _assertString.default)(str);
      return ['true', 'false', '1', '0'].indexOf(str) >= 0;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isBoolean_1);

    var isLocale_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isLocale;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var localeReg = /^[A-z]{2,4}([_-]([A-z]{4}|[\d]{3}))?([_-]([A-z]{2}|[\d]{3}))?$/;

    function isLocale(str) {
      (0, _assertString.default)(str);

      if (str === 'en_US_POSIX' || str === 'ca_ES_VALENCIA') {
        return true;
      }

      return localeReg.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isLocale_1);

    var isAlpha_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isAlpha;
    exports.locales = void 0;

    var _assertString = _interopRequireDefault(assertString_1);



    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isAlpha(_str) {
      var locale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'en-US';
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      (0, _assertString.default)(_str);
      var str = _str;
      var ignore = options.ignore;

      if (ignore) {
        if (ignore instanceof RegExp) {
          str = str.replace(ignore, '');
        } else if (typeof ignore === 'string') {
          str = str.replace(new RegExp("[".concat(ignore.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&'), "]"), 'g'), ''); // escape regex for ignore
        } else {
          throw new Error('ignore should be instance of a String or RegExp');
        }
      }

      if (locale in alpha_1.alpha) {
        return alpha_1.alpha[locale].test(str);
      }

      throw new Error("Invalid locale '".concat(locale, "'"));
    }

    var locales = Object.keys(alpha_1.alpha);
    exports.locales = locales;
    });

    unwrapExports(isAlpha_1);
    isAlpha_1.locales;

    var isAlphanumeric_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isAlphanumeric;
    exports.locales = void 0;

    var _assertString = _interopRequireDefault(assertString_1);



    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isAlphanumeric(str) {
      var locale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'en-US';
      (0, _assertString.default)(str);

      if (locale in alpha_1.alphanumeric) {
        return alpha_1.alphanumeric[locale].test(str);
      }

      throw new Error("Invalid locale '".concat(locale, "'"));
    }

    var locales = Object.keys(alpha_1.alphanumeric);
    exports.locales = locales;
    });

    unwrapExports(isAlphanumeric_1);
    isAlphanumeric_1.locales;

    var isNumeric_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isNumeric;

    var _assertString = _interopRequireDefault(assertString_1);



    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var numericNoSymbols = /^[0-9]+$/;

    function isNumeric(str, options) {
      (0, _assertString.default)(str);

      if (options && options.no_symbols) {
        return numericNoSymbols.test(str);
      }

      return new RegExp("^[+-]?([0-9]*[".concat((options || {}).locale ? alpha_1.decimal[options.locale] : '.', "])?[0-9]+$")).test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isNumeric_1);

    var isPassportNumber_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isPassportNumber;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * Reference:
     * https://en.wikipedia.org/ -- Wikipedia
     * https://docs.microsoft.com/en-us/microsoft-365/compliance/eu-passport-number -- EU Passport Number
     * https://countrycode.org/ -- Country Codes
     */
    var passportRegexByCountryCode = {
      AM: /^[A-Z]{2}\d{7}$/,
      // ARMENIA
      AR: /^[A-Z]{3}\d{6}$/,
      // ARGENTINA
      AT: /^[A-Z]\d{7}$/,
      // AUSTRIA
      AU: /^[A-Z]\d{7}$/,
      // AUSTRALIA
      BE: /^[A-Z]{2}\d{6}$/,
      // BELGIUM
      BG: /^\d{9}$/,
      // BULGARIA
      BY: /^[A-Z]{2}\d{7}$/,
      // BELARUS
      CA: /^[A-Z]{2}\d{6}$/,
      // CANADA
      CH: /^[A-Z]\d{7}$/,
      // SWITZERLAND
      CN: /^[GE]\d{8}$/,
      // CHINA [G=Ordinary, E=Electronic] followed by 8-digits
      CY: /^[A-Z](\d{6}|\d{8})$/,
      // CYPRUS
      CZ: /^\d{8}$/,
      // CZECH REPUBLIC
      DE: /^[CFGHJKLMNPRTVWXYZ0-9]{9}$/,
      // GERMANY
      DK: /^\d{9}$/,
      // DENMARK
      DZ: /^\d{9}$/,
      // ALGERIA
      EE: /^([A-Z]\d{7}|[A-Z]{2}\d{7})$/,
      // ESTONIA (K followed by 7-digits), e-passports have 2 UPPERCASE followed by 7 digits
      ES: /^[A-Z0-9]{2}([A-Z0-9]?)\d{6}$/,
      // SPAIN
      FI: /^[A-Z]{2}\d{7}$/,
      // FINLAND
      FR: /^\d{2}[A-Z]{2}\d{5}$/,
      // FRANCE
      GB: /^\d{9}$/,
      // UNITED KINGDOM
      GR: /^[A-Z]{2}\d{7}$/,
      // GREECE
      HR: /^\d{9}$/,
      // CROATIA
      HU: /^[A-Z]{2}(\d{6}|\d{7})$/,
      // HUNGARY
      IE: /^[A-Z0-9]{2}\d{7}$/,
      // IRELAND
      IN: /^[A-Z]{1}-?\d{7}$/,
      // INDIA
      IS: /^(A)\d{7}$/,
      // ICELAND
      IT: /^[A-Z0-9]{2}\d{7}$/,
      // ITALY
      JP: /^[A-Z]{2}\d{7}$/,
      // JAPAN
      KR: /^[MS]\d{8}$/,
      // SOUTH KOREA, REPUBLIC OF KOREA, [S=PS Passports, M=PM Passports]
      LT: /^[A-Z0-9]{8}$/,
      // LITHUANIA
      LU: /^[A-Z0-9]{8}$/,
      // LUXEMBURG
      LV: /^[A-Z0-9]{2}\d{7}$/,
      // LATVIA
      MT: /^\d{7}$/,
      // MALTA
      NL: /^[A-Z]{2}[A-Z0-9]{6}\d$/,
      // NETHERLANDS
      PO: /^[A-Z]{2}\d{7}$/,
      // POLAND
      PT: /^[A-Z]\d{6}$/,
      // PORTUGAL
      RO: /^\d{8,9}$/,
      // ROMANIA
      RU: /^\d{2}\d{2}\d{6}$/,
      // RUSSIAN FEDERATION
      SE: /^\d{8}$/,
      // SWEDEN
      SL: /^(P)[A-Z]\d{7}$/,
      // SLOVANIA
      SK: /^[0-9A-Z]\d{7}$/,
      // SLOVAKIA
      TR: /^[A-Z]\d{8}$/,
      // TURKEY
      UA: /^[A-Z]{2}\d{6}$/,
      // UKRAINE
      US: /^\d{9}$/ // UNITED STATES

    };
    /**
     * Check if str is a valid passport number
     * relative to provided ISO Country Code.
     *
     * @param {string} str
     * @param {string} countryCode
     * @return {boolean}
     */

    function isPassportNumber(str, countryCode) {
      (0, _assertString.default)(str);
      /** Remove All Whitespaces, Convert to UPPERCASE */

      var normalizedStr = str.replace(/\s/g, '').toUpperCase();
      return countryCode.toUpperCase() in passportRegexByCountryCode && passportRegexByCountryCode[countryCode].test(normalizedStr);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isPassportNumber_1);

    var isInt_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isInt;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var int = /^(?:[-+]?(?:0|[1-9][0-9]*))$/;
    var intLeadingZeroes = /^[-+]?[0-9]+$/;

    function isInt(str, options) {
      (0, _assertString.default)(str);
      options = options || {}; // Get the regex to use for testing, based on whether
      // leading zeroes are allowed or not.

      var regex = options.hasOwnProperty('allow_leading_zeroes') && !options.allow_leading_zeroes ? int : intLeadingZeroes; // Check min/max/lt/gt

      var minCheckPassed = !options.hasOwnProperty('min') || str >= options.min;
      var maxCheckPassed = !options.hasOwnProperty('max') || str <= options.max;
      var ltCheckPassed = !options.hasOwnProperty('lt') || str < options.lt;
      var gtCheckPassed = !options.hasOwnProperty('gt') || str > options.gt;
      return regex.test(str) && minCheckPassed && maxCheckPassed && ltCheckPassed && gtCheckPassed;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isInt_1);

    var isPort_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isPort;

    var _isInt = _interopRequireDefault(isInt_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isPort(str) {
      return (0, _isInt.default)(str, {
        min: 0,
        max: 65535
      });
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isPort_1);

    var isLowercase_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isLowercase;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isLowercase(str) {
      (0, _assertString.default)(str);
      return str === str.toLowerCase();
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isLowercase_1);

    var isUppercase_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isUppercase;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isUppercase(str) {
      (0, _assertString.default)(str);
      return str === str.toUpperCase();
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isUppercase_1);

    var isIMEI_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isIMEI;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var imeiRegexWithoutHypens = /^[0-9]{15}$/;
    var imeiRegexWithHypens = /^\d{2}-\d{6}-\d{6}-\d{1}$/;

    function isIMEI(str, options) {
      (0, _assertString.default)(str);
      options = options || {}; // default regex for checking imei is the one without hyphens

      var imeiRegex = imeiRegexWithoutHypens;

      if (options.allow_hyphens) {
        imeiRegex = imeiRegexWithHypens;
      }

      if (!imeiRegex.test(str)) {
        return false;
      }

      str = str.replace(/-/g, '');
      var sum = 0,
          mul = 2,
          l = 14;

      for (var i = 0; i < l; i++) {
        var digit = str.substring(l - i - 1, l - i);
        var tp = parseInt(digit, 10) * mul;

        if (tp >= 10) {
          sum += tp % 10 + 1;
        } else {
          sum += tp;
        }

        if (mul === 1) {
          mul += 1;
        } else {
          mul -= 1;
        }
      }

      var chk = (10 - sum % 10) % 10;

      if (chk !== parseInt(str.substring(14, 15), 10)) {
        return false;
      }

      return true;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isIMEI_1);

    var isAscii_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isAscii;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /* eslint-disable no-control-regex */
    var ascii = /^[\x00-\x7F]+$/;
    /* eslint-enable no-control-regex */

    function isAscii(str) {
      (0, _assertString.default)(str);
      return ascii.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isAscii_1);

    var isFullWidth_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isFullWidth;
    exports.fullWidth = void 0;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var fullWidth = /[^\u0020-\u007E\uFF61-\uFF9F\uFFA0-\uFFDC\uFFE8-\uFFEE0-9a-zA-Z]/;
    exports.fullWidth = fullWidth;

    function isFullWidth(str) {
      (0, _assertString.default)(str);
      return fullWidth.test(str);
    }
    });

    unwrapExports(isFullWidth_1);
    isFullWidth_1.fullWidth;

    var isHalfWidth_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isHalfWidth;
    exports.halfWidth = void 0;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var halfWidth = /[\u0020-\u007E\uFF61-\uFF9F\uFFA0-\uFFDC\uFFE8-\uFFEE0-9a-zA-Z]/;
    exports.halfWidth = halfWidth;

    function isHalfWidth(str) {
      (0, _assertString.default)(str);
      return halfWidth.test(str);
    }
    });

    unwrapExports(isHalfWidth_1);
    isHalfWidth_1.halfWidth;

    var isVariableWidth_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isVariableWidth;

    var _assertString = _interopRequireDefault(assertString_1);





    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isVariableWidth(str) {
      (0, _assertString.default)(str);
      return isFullWidth_1.fullWidth.test(str) && isHalfWidth_1.halfWidth.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isVariableWidth_1);

    var isMultibyte_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isMultibyte;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /* eslint-disable no-control-regex */
    var multibyte = /[^\x00-\x7F]/;
    /* eslint-enable no-control-regex */

    function isMultibyte(str) {
      (0, _assertString.default)(str);
      return multibyte.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isMultibyte_1);

    var multilineRegex = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = multilineRegexp;

    /**
     * Build RegExp object from an array
     * of multiple/multi-line regexp parts
     *
     * @param {string[]} parts
     * @param {string} flags
     * @return {object} - RegExp object
     */
    function multilineRegexp(parts, flags) {
      var regexpAsStringLiteral = parts.join('');
      return new RegExp(regexpAsStringLiteral, flags);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(multilineRegex);

    var isSemVer_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isSemVer;

    var _assertString = _interopRequireDefault(assertString_1);

    var _multilineRegex = _interopRequireDefault(multilineRegex);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * Regular Expression to match
     * semantic versioning (SemVer)
     * built from multi-line, multi-parts regexp
     * Reference: https://semver.org/
     */
    var semanticVersioningRegex = (0, _multilineRegex.default)(['^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)', '(?:-((?:0|[1-9]\\d*|\\d*[a-z-][0-9a-z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-z-][0-9a-z-]*))*))', '?(?:\\+([0-9a-z-]+(?:\\.[0-9a-z-]+)*))?$'], 'i');

    function isSemVer(str) {
      (0, _assertString.default)(str);
      return semanticVersioningRegex.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isSemVer_1);

    var isSurrogatePair_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isSurrogatePair;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var surrogatePair = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;

    function isSurrogatePair(str) {
      (0, _assertString.default)(str);
      return surrogatePair.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isSurrogatePair_1);

    var includes_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;

    var includes = function includes(arr, val) {
      return arr.some(function (arrVal) {
        return val === arrVal;
      });
    };

    var _default = includes;
    exports.default = _default;
    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(includes_1);

    var isDecimal_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isDecimal;

    var _merge = _interopRequireDefault(merge_1);

    var _assertString = _interopRequireDefault(assertString_1);

    var _includes = _interopRequireDefault(includes_1);



    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function decimalRegExp(options) {
      var regExp = new RegExp("^[-+]?([0-9]+)?(\\".concat(alpha_1.decimal[options.locale], "[0-9]{").concat(options.decimal_digits, "})").concat(options.force_decimal ? '' : '?', "$"));
      return regExp;
    }

    var default_decimal_options = {
      force_decimal: false,
      decimal_digits: '1,',
      locale: 'en-US'
    };
    var blacklist = ['', '-', '+'];

    function isDecimal(str, options) {
      (0, _assertString.default)(str);
      options = (0, _merge.default)(options, default_decimal_options);

      if (options.locale in alpha_1.decimal) {
        return !(0, _includes.default)(blacklist, str.replace(/ /g, '')) && decimalRegExp(options).test(str);
      }

      throw new Error("Invalid locale '".concat(options.locale, "'"));
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isDecimal_1);

    var isHexadecimal_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isHexadecimal;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var hexadecimal = /^(0x|0h)?[0-9A-F]+$/i;

    function isHexadecimal(str) {
      (0, _assertString.default)(str);
      return hexadecimal.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isHexadecimal_1);

    var isOctal_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isOctal;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var octal = /^(0o)?[0-7]+$/i;

    function isOctal(str) {
      (0, _assertString.default)(str);
      return octal.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isOctal_1);

    var isDivisibleBy_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isDivisibleBy;

    var _assertString = _interopRequireDefault(assertString_1);

    var _toFloat = _interopRequireDefault(toFloat_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isDivisibleBy(str, num) {
      (0, _assertString.default)(str);
      return (0, _toFloat.default)(str) % parseInt(num, 10) === 0;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isDivisibleBy_1);

    var isHexColor_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isHexColor;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var hexcolor = /^#?([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;

    function isHexColor(str) {
      (0, _assertString.default)(str);
      return hexcolor.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isHexColor_1);

    var isRgbColor_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isRgbColor;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var rgbColor = /^rgb\((([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]),){2}([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\)$/;
    var rgbaColor = /^rgba\((([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]),){3}(0?\.\d|1(\.0)?|0(\.0)?)\)$/;
    var rgbColorPercent = /^rgb\((([0-9]%|[1-9][0-9]%|100%),){2}([0-9]%|[1-9][0-9]%|100%)\)/;
    var rgbaColorPercent = /^rgba\((([0-9]%|[1-9][0-9]%|100%),){3}(0?\.\d|1(\.0)?|0(\.0)?)\)/;

    function isRgbColor(str) {
      var includePercentValues = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
      (0, _assertString.default)(str);

      if (!includePercentValues) {
        return rgbColor.test(str) || rgbaColor.test(str);
      }

      return rgbColor.test(str) || rgbaColor.test(str) || rgbColorPercent.test(str) || rgbaColorPercent.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isRgbColor_1);

    var isHSL_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isHSL;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var hslcomma = /^(hsl)a?\(\s*((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?))(deg|grad|rad|turn|\s*)(\s*,\s*(\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%){2}\s*(,\s*((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%?)\s*)?\)$/i;
    var hslspace = /^(hsl)a?\(\s*((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?))(deg|grad|rad|turn|\s)(\s*(\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%){2}\s*(\/\s*((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%?)\s*)?\)$/i;

    function isHSL(str) {
      (0, _assertString.default)(str);
      return hslcomma.test(str) || hslspace.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isHSL_1);

    var isISRC_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isISRC;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    // see http://isrc.ifpi.org/en/isrc-standard/code-syntax
    var isrc = /^[A-Z]{2}[0-9A-Z]{3}\d{2}\d{5}$/;

    function isISRC(str) {
      (0, _assertString.default)(str);
      return isrc.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isISRC_1);

    var isIBAN_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isIBAN;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * List of country codes with
     * corresponding IBAN regular expression
     * Reference: https://en.wikipedia.org/wiki/International_Bank_Account_Number
     */
    var ibanRegexThroughCountryCode = {
      AD: /^(AD[0-9]{2})\d{8}[A-Z0-9]{12}$/,
      AE: /^(AE[0-9]{2})\d{3}\d{16}$/,
      AL: /^(AL[0-9]{2})\d{8}[A-Z0-9]{16}$/,
      AT: /^(AT[0-9]{2})\d{16}$/,
      AZ: /^(AZ[0-9]{2})[A-Z0-9]{4}\d{20}$/,
      BA: /^(BA[0-9]{2})\d{16}$/,
      BE: /^(BE[0-9]{2})\d{12}$/,
      BG: /^(BG[0-9]{2})[A-Z]{4}\d{6}[A-Z0-9]{8}$/,
      BH: /^(BH[0-9]{2})[A-Z]{4}[A-Z0-9]{14}$/,
      BR: /^(BR[0-9]{2})\d{23}[A-Z]{1}[A-Z0-9]{1}$/,
      BY: /^(BY[0-9]{2})[A-Z0-9]{4}\d{20}$/,
      CH: /^(CH[0-9]{2})\d{5}[A-Z0-9]{12}$/,
      CR: /^(CR[0-9]{2})\d{18}$/,
      CY: /^(CY[0-9]{2})\d{8}[A-Z0-9]{16}$/,
      CZ: /^(CZ[0-9]{2})\d{20}$/,
      DE: /^(DE[0-9]{2})\d{18}$/,
      DK: /^(DK[0-9]{2})\d{14}$/,
      DO: /^(DO[0-9]{2})[A-Z]{4}\d{20}$/,
      EE: /^(EE[0-9]{2})\d{16}$/,
      EG: /^(EG[0-9]{2})\d{25}$/,
      ES: /^(ES[0-9]{2})\d{20}$/,
      FI: /^(FI[0-9]{2})\d{14}$/,
      FO: /^(FO[0-9]{2})\d{14}$/,
      FR: /^(FR[0-9]{2})\d{10}[A-Z0-9]{11}\d{2}$/,
      GB: /^(GB[0-9]{2})[A-Z]{4}\d{14}$/,
      GE: /^(GE[0-9]{2})[A-Z0-9]{2}\d{16}$/,
      GI: /^(GI[0-9]{2})[A-Z]{4}[A-Z0-9]{15}$/,
      GL: /^(GL[0-9]{2})\d{14}$/,
      GR: /^(GR[0-9]{2})\d{7}[A-Z0-9]{16}$/,
      GT: /^(GT[0-9]{2})[A-Z0-9]{4}[A-Z0-9]{20}$/,
      HR: /^(HR[0-9]{2})\d{17}$/,
      HU: /^(HU[0-9]{2})\d{24}$/,
      IE: /^(IE[0-9]{2})[A-Z0-9]{4}\d{14}$/,
      IL: /^(IL[0-9]{2})\d{19}$/,
      IQ: /^(IQ[0-9]{2})[A-Z]{4}\d{15}$/,
      IR: /^(IR[0-9]{2})0\d{2}0\d{18}$/,
      IS: /^(IS[0-9]{2})\d{22}$/,
      IT: /^(IT[0-9]{2})[A-Z]{1}\d{10}[A-Z0-9]{12}$/,
      JO: /^(JO[0-9]{2})[A-Z]{4}\d{22}$/,
      KW: /^(KW[0-9]{2})[A-Z]{4}[A-Z0-9]{22}$/,
      KZ: /^(KZ[0-9]{2})\d{3}[A-Z0-9]{13}$/,
      LB: /^(LB[0-9]{2})\d{4}[A-Z0-9]{20}$/,
      LC: /^(LC[0-9]{2})[A-Z]{4}[A-Z0-9]{24}$/,
      LI: /^(LI[0-9]{2})\d{5}[A-Z0-9]{12}$/,
      LT: /^(LT[0-9]{2})\d{16}$/,
      LU: /^(LU[0-9]{2})\d{3}[A-Z0-9]{13}$/,
      LV: /^(LV[0-9]{2})[A-Z]{4}[A-Z0-9]{13}$/,
      MC: /^(MC[0-9]{2})\d{10}[A-Z0-9]{11}\d{2}$/,
      MD: /^(MD[0-9]{2})[A-Z0-9]{20}$/,
      ME: /^(ME[0-9]{2})\d{18}$/,
      MK: /^(MK[0-9]{2})\d{3}[A-Z0-9]{10}\d{2}$/,
      MR: /^(MR[0-9]{2})\d{23}$/,
      MT: /^(MT[0-9]{2})[A-Z]{4}\d{5}[A-Z0-9]{18}$/,
      MU: /^(MU[0-9]{2})[A-Z]{4}\d{19}[A-Z]{3}$/,
      NL: /^(NL[0-9]{2})[A-Z]{4}\d{10}$/,
      NO: /^(NO[0-9]{2})\d{11}$/,
      PK: /^(PK[0-9]{2})[A-Z0-9]{4}\d{16}$/,
      PL: /^(PL[0-9]{2})\d{24}$/,
      PS: /^(PS[0-9]{2})[A-Z0-9]{4}\d{21}$/,
      PT: /^(PT[0-9]{2})\d{21}$/,
      QA: /^(QA[0-9]{2})[A-Z]{4}[A-Z0-9]{21}$/,
      RO: /^(RO[0-9]{2})[A-Z]{4}[A-Z0-9]{16}$/,
      RS: /^(RS[0-9]{2})\d{18}$/,
      SA: /^(SA[0-9]{2})\d{2}[A-Z0-9]{18}$/,
      SC: /^(SC[0-9]{2})[A-Z]{4}\d{20}[A-Z]{3}$/,
      SE: /^(SE[0-9]{2})\d{20}$/,
      SI: /^(SI[0-9]{2})\d{15}$/,
      SK: /^(SK[0-9]{2})\d{20}$/,
      SM: /^(SM[0-9]{2})[A-Z]{1}\d{10}[A-Z0-9]{12}$/,
      SV: /^(SV[0-9]{2})[A-Z0-9]{4}\d{20}$/,
      TL: /^(TL[0-9]{2})\d{19}$/,
      TN: /^(TN[0-9]{2})\d{20}$/,
      TR: /^(TR[0-9]{2})\d{5}[A-Z0-9]{17}$/,
      UA: /^(UA[0-9]{2})\d{6}[A-Z0-9]{19}$/,
      VA: /^(VA[0-9]{2})\d{18}$/,
      VG: /^(VG[0-9]{2})[A-Z0-9]{4}\d{16}$/,
      XK: /^(XK[0-9]{2})\d{16}$/
    };
    /**
     * Check whether string has correct universal IBAN format
     * The IBAN consists of up to 34 alphanumeric characters, as follows:
     * Country Code using ISO 3166-1 alpha-2, two letters
     * check digits, two digits and
     * Basic Bank Account Number (BBAN), up to 30 alphanumeric characters.
     * NOTE: Permitted IBAN characters are: digits [0-9] and the 26 latin alphabetic [A-Z]
     *
     * @param {string} str - string under validation
     * @return {boolean}
     */

    function hasValidIbanFormat(str) {
      // Strip white spaces and hyphens
      var strippedStr = str.replace(/[\s\-]+/gi, '').toUpperCase();
      var isoCountryCode = strippedStr.slice(0, 2).toUpperCase();
      return isoCountryCode in ibanRegexThroughCountryCode && ibanRegexThroughCountryCode[isoCountryCode].test(strippedStr);
    }
    /**
       * Check whether string has valid IBAN Checksum
       * by performing basic mod-97 operation and
       * the remainder should equal 1
       * -- Start by rearranging the IBAN by moving the four initial characters to the end of the string
       * -- Replace each letter in the string with two digits, A -> 10, B = 11, Z = 35
       * -- Interpret the string as a decimal integer and
       * -- compute the remainder on division by 97 (mod 97)
       * Reference: https://en.wikipedia.org/wiki/International_Bank_Account_Number
       *
       * @param {string} str
       * @return {boolean}
       */


    function hasValidIbanChecksum(str) {
      var strippedStr = str.replace(/[^A-Z0-9]+/gi, '').toUpperCase(); // Keep only digits and A-Z latin alphabetic

      var rearranged = strippedStr.slice(4) + strippedStr.slice(0, 4);
      var alphaCapsReplacedWithDigits = rearranged.replace(/[A-Z]/g, function (char) {
        return char.charCodeAt(0) - 55;
      });
      var remainder = alphaCapsReplacedWithDigits.match(/\d{1,7}/g).reduce(function (acc, value) {
        return Number(acc + value) % 97;
      }, '');
      return remainder === 1;
    }

    function isIBAN(str) {
      (0, _assertString.default)(str);
      return hasValidIbanFormat(str) && hasValidIbanChecksum(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isIBAN_1);

    var isBIC_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isBIC;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var isBICReg = /^[A-z]{4}[A-z]{2}\w{2}(\w{3})?$/;

    function isBIC(str) {
      (0, _assertString.default)(str);
      return isBICReg.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isBIC_1);

    var isMD5_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isMD5;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var md5 = /^[a-f0-9]{32}$/;

    function isMD5(str) {
      (0, _assertString.default)(str);
      return md5.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isMD5_1);

    var isHash_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isHash;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var lengths = {
      md5: 32,
      md4: 32,
      sha1: 40,
      sha256: 64,
      sha384: 96,
      sha512: 128,
      ripemd128: 32,
      ripemd160: 40,
      tiger128: 32,
      tiger160: 40,
      tiger192: 48,
      crc32: 8,
      crc32b: 8
    };

    function isHash(str, algorithm) {
      (0, _assertString.default)(str);
      var hash = new RegExp("^[a-fA-F0-9]{".concat(lengths[algorithm], "}$"));
      return hash.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isHash_1);

    var isBase64_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isBase64;

    var _assertString = _interopRequireDefault(assertString_1);

    var _merge = _interopRequireDefault(merge_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var notBase64 = /[^A-Z0-9+\/=]/i;
    var urlSafeBase64 = /^[A-Z0-9_\-]*$/i;
    var defaultBase64Options = {
      urlSafe: false
    };

    function isBase64(str, options) {
      (0, _assertString.default)(str);
      options = (0, _merge.default)(options, defaultBase64Options);
      var len = str.length;

      if (options.urlSafe) {
        return urlSafeBase64.test(str);
      }

      if (len % 4 !== 0 || notBase64.test(str)) {
        return false;
      }

      var firstPaddingChar = str.indexOf('=');
      return firstPaddingChar === -1 || firstPaddingChar === len - 1 || firstPaddingChar === len - 2 && str[len - 1] === '=';
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isBase64_1);

    var isJWT_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isJWT;

    var _assertString = _interopRequireDefault(assertString_1);

    var _isBase = _interopRequireDefault(isBase64_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isJWT(str) {
      (0, _assertString.default)(str);
      var dotSplit = str.split('.');
      var len = dotSplit.length;

      if (len > 3 || len < 2) {
        return false;
      }

      return dotSplit.reduce(function (acc, currElem) {
        return acc && (0, _isBase.default)(currElem, {
          urlSafe: true
        });
      }, true);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isJWT_1);

    var isJSON_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isJSON;

    var _assertString = _interopRequireDefault(assertString_1);

    var _merge = _interopRequireDefault(merge_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    var default_json_options = {
      allow_primitives: false
    };

    function isJSON(str, options) {
      (0, _assertString.default)(str);

      try {
        options = (0, _merge.default)(options, default_json_options);
        var primitives = [];

        if (options.allow_primitives) {
          primitives = [null, false, true];
        }

        var obj = JSON.parse(str);
        return primitives.includes(obj) || !!obj && _typeof(obj) === 'object';
      } catch (e) {
        /* ignore */
      }

      return false;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isJSON_1);

    var isEmpty_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isEmpty;

    var _assertString = _interopRequireDefault(assertString_1);

    var _merge = _interopRequireDefault(merge_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var default_is_empty_options = {
      ignore_whitespace: false
    };

    function isEmpty(str, options) {
      (0, _assertString.default)(str);
      options = (0, _merge.default)(options, default_is_empty_options);
      return (options.ignore_whitespace ? str.trim().length : str.length) === 0;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isEmpty_1);

    var isLength_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isLength;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    /* eslint-disable prefer-rest-params */
    function isLength(str, options) {
      (0, _assertString.default)(str);
      var min;
      var max;

      if (_typeof(options) === 'object') {
        min = options.min || 0;
        max = options.max;
      } else {
        // backwards compatibility: isLength(str, min [, max])
        min = arguments[1] || 0;
        max = arguments[2];
      }

      var surrogatePairs = str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || [];
      var len = str.length - surrogatePairs.length;
      return len >= min && (typeof max === 'undefined' || len <= max);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isLength_1);

    var isUUID_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isUUID;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var uuid = {
      3: /^[0-9A-F]{8}-[0-9A-F]{4}-3[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i,
      4: /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      5: /^[0-9A-F]{8}-[0-9A-F]{4}-5[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      all: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
    };

    function isUUID(str) {
      var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'all';
      (0, _assertString.default)(str);
      var pattern = uuid[version];
      return pattern && pattern.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isUUID_1);

    var isMongoId_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isMongoId;

    var _assertString = _interopRequireDefault(assertString_1);

    var _isHexadecimal = _interopRequireDefault(isHexadecimal_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isMongoId(str) {
      (0, _assertString.default)(str);
      return (0, _isHexadecimal.default)(str) && str.length === 24;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isMongoId_1);

    var isAfter_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isAfter;

    var _assertString = _interopRequireDefault(assertString_1);

    var _toDate = _interopRequireDefault(toDate_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isAfter(str) {
      var date = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : String(new Date());
      (0, _assertString.default)(str);
      var comparison = (0, _toDate.default)(date);
      var original = (0, _toDate.default)(str);
      return !!(original && comparison && original > comparison);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isAfter_1);

    var isBefore_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isBefore;

    var _assertString = _interopRequireDefault(assertString_1);

    var _toDate = _interopRequireDefault(toDate_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isBefore(str) {
      var date = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : String(new Date());
      (0, _assertString.default)(str);
      var comparison = (0, _toDate.default)(date);
      var original = (0, _toDate.default)(str);
      return !!(original && comparison && original < comparison);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isBefore_1);

    var isIn_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isIn;

    var _assertString = _interopRequireDefault(assertString_1);

    var _toString = _interopRequireDefault(toString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    function isIn(str, options) {
      (0, _assertString.default)(str);
      var i;

      if (Object.prototype.toString.call(options) === '[object Array]') {
        var array = [];

        for (i in options) {
          // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes
          // istanbul ignore else
          if ({}.hasOwnProperty.call(options, i)) {
            array[i] = (0, _toString.default)(options[i]);
          }
        }

        return array.indexOf(str) >= 0;
      } else if (_typeof(options) === 'object') {
        return options.hasOwnProperty(str);
      } else if (options && typeof options.indexOf === 'function') {
        return options.indexOf(str) >= 0;
      }

      return false;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isIn_1);

    var isCreditCard_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isCreditCard;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /* eslint-disable max-len */
    var creditCard = /^(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11}|6[27][0-9]{14})$/;
    /* eslint-enable max-len */

    function isCreditCard(str) {
      (0, _assertString.default)(str);
      var sanitized = str.replace(/[- ]+/g, '');

      if (!creditCard.test(sanitized)) {
        return false;
      }

      var sum = 0;
      var digit;
      var tmpNum;
      var shouldDouble;

      for (var i = sanitized.length - 1; i >= 0; i--) {
        digit = sanitized.substring(i, i + 1);
        tmpNum = parseInt(digit, 10);

        if (shouldDouble) {
          tmpNum *= 2;

          if (tmpNum >= 10) {
            sum += tmpNum % 10 + 1;
          } else {
            sum += tmpNum;
          }
        } else {
          sum += tmpNum;
        }

        shouldDouble = !shouldDouble;
      }

      return !!(sum % 10 === 0 ? sanitized : false);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isCreditCard_1);

    var isIdentityCard_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isIdentityCard;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var validators = {
      ES: function ES(str) {
        (0, _assertString.default)(str);
        var DNI = /^[0-9X-Z][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/;
        var charsValue = {
          X: 0,
          Y: 1,
          Z: 2
        };
        var controlDigits = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E']; // sanitize user input

        var sanitized = str.trim().toUpperCase(); // validate the data structure

        if (!DNI.test(sanitized)) {
          return false;
        } // validate the control digit


        var number = sanitized.slice(0, -1).replace(/[X,Y,Z]/g, function (char) {
          return charsValue[char];
        });
        return sanitized.endsWith(controlDigits[number % 23]);
      },
      IN: function IN(str) {
        var DNI = /^[1-9]\d{3}\s?\d{4}\s?\d{4}$/; // multiplication table

        var d = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]]; // permutation table

        var p = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]]; // sanitize user input

        var sanitized = str.trim(); // validate the data structure

        if (!DNI.test(sanitized)) {
          return false;
        }

        var c = 0;
        var invertedArray = sanitized.replace(/\s/g, '').split('').map(Number).reverse();
        invertedArray.forEach(function (val, i) {
          c = d[c][p[i % 8][val]];
        });
        return c === 0;
      },
      IT: function IT(str) {
        if (str.length !== 9) return false;
        if (str === 'CA00000AA') return false; // https://it.wikipedia.org/wiki/Carta_d%27identit%C3%A0_elettronica_italiana

        return str.search(/C[A-Z][0-9]{5}[A-Z]{2}/i) > -1;
      },
      NO: function NO(str) {
        var sanitized = str.trim();
        if (isNaN(Number(sanitized))) return false;
        if (sanitized.length !== 11) return false;
        if (sanitized === '00000000000') return false; // https://no.wikipedia.org/wiki/F%C3%B8dselsnummer

        var f = sanitized.split('').map(Number);
        var k1 = (11 - (3 * f[0] + 7 * f[1] + 6 * f[2] + 1 * f[3] + 8 * f[4] + 9 * f[5] + 4 * f[6] + 5 * f[7] + 2 * f[8]) % 11) % 11;
        var k2 = (11 - (5 * f[0] + 4 * f[1] + 3 * f[2] + 2 * f[3] + 7 * f[4] + 6 * f[5] + 5 * f[6] + 4 * f[7] + 3 * f[8] + 2 * k1) % 11) % 11;
        if (k1 !== f[9] || k2 !== f[10]) return false;
        return true;
      },
      'he-IL': function heIL(str) {
        var DNI = /^\d{9}$/; // sanitize user input

        var sanitized = str.trim(); // validate the data structure

        if (!DNI.test(sanitized)) {
          return false;
        }

        var id = sanitized;
        var sum = 0,
            incNum;

        for (var i = 0; i < id.length; i++) {
          incNum = Number(id[i]) * (i % 2 + 1); // Multiply number by 1 or 2

          sum += incNum > 9 ? incNum - 9 : incNum; // Sum the digits up and add to total
        }

        return sum % 10 === 0;
      },
      'ar-TN': function arTN(str) {
        var DNI = /^\d{8}$/; // sanitize user input

        var sanitized = str.trim(); // validate the data structure

        if (!DNI.test(sanitized)) {
          return false;
        }

        return true;
      },
      'zh-CN': function zhCN(str) {
        var provincesAndCities = ['11', // 北京
        '12', // 天津
        '13', // 河北
        '14', // 山西
        '15', // 内蒙古
        '21', // 辽宁
        '22', // 吉林
        '23', // 黑龙江
        '31', // 上海
        '32', // 江苏
        '33', // 浙江
        '34', // 安徽
        '35', // 福建
        '36', // 江西
        '37', // 山东
        '41', // 河南
        '42', // 湖北
        '43', // 湖南
        '44', // 广东
        '45', // 广西
        '46', // 海南
        '50', // 重庆
        '51', // 四川
        '52', // 贵州
        '53', // 云南
        '54', // 西藏
        '61', // 陕西
        '62', // 甘肃
        '63', // 青海
        '64', // 宁夏
        '65', // 新疆
        '71', // 台湾
        '81', // 香港
        '82', // 澳门
        '91' // 国外
        ];
        var powers = ['7', '9', '10', '5', '8', '4', '2', '1', '6', '3', '7', '9', '10', '5', '8', '4', '2'];
        var parityBit = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

        var checkAddressCode = function checkAddressCode(addressCode) {
          return provincesAndCities.includes(addressCode);
        };

        var checkBirthDayCode = function checkBirthDayCode(birDayCode) {
          var yyyy = parseInt(birDayCode.substring(0, 4), 10);
          var mm = parseInt(birDayCode.substring(4, 6), 10);
          var dd = parseInt(birDayCode.substring(6), 10);
          var xdata = new Date(yyyy, mm - 1, dd);

          if (xdata > new Date()) {
            return false; // eslint-disable-next-line max-len
          } else if (xdata.getFullYear() === yyyy && xdata.getMonth() === mm - 1 && xdata.getDate() === dd) {
            return true;
          }

          return false;
        };

        var getParityBit = function getParityBit(idCardNo) {
          var id17 = idCardNo.substring(0, 17);
          var power = 0;

          for (var i = 0; i < 17; i++) {
            power += parseInt(id17.charAt(i), 10) * parseInt(powers[i], 10);
          }

          var mod = power % 11;
          return parityBit[mod];
        };

        var checkParityBit = function checkParityBit(idCardNo) {
          return getParityBit(idCardNo) === idCardNo.charAt(17).toUpperCase();
        };

        var check15IdCardNo = function check15IdCardNo(idCardNo) {
          var check = /^[1-9]\d{7}((0[1-9])|(1[0-2]))((0[1-9])|([1-2][0-9])|(3[0-1]))\d{3}$/.test(idCardNo);
          if (!check) return false;
          var addressCode = idCardNo.substring(0, 2);
          check = checkAddressCode(addressCode);
          if (!check) return false;
          var birDayCode = "19".concat(idCardNo.substring(6, 12));
          check = checkBirthDayCode(birDayCode);
          if (!check) return false;
          return true;
        };

        var check18IdCardNo = function check18IdCardNo(idCardNo) {
          var check = /^[1-9]\d{5}[1-9]\d{3}((0[1-9])|(1[0-2]))((0[1-9])|([1-2][0-9])|(3[0-1]))\d{3}(\d|x|X)$/.test(idCardNo);
          if (!check) return false;
          var addressCode = idCardNo.substring(0, 2);
          check = checkAddressCode(addressCode);
          if (!check) return false;
          var birDayCode = idCardNo.substring(6, 14);
          check = checkBirthDayCode(birDayCode);
          if (!check) return false;
          return checkParityBit(idCardNo);
        };

        var checkIdCardNo = function checkIdCardNo(idCardNo) {
          var check = /^\d{15}|(\d{17}(\d|x|X))$/.test(idCardNo);
          if (!check) return false;

          if (idCardNo.length === 15) {
            return check15IdCardNo(idCardNo);
          }

          return check18IdCardNo(idCardNo);
        };

        return checkIdCardNo(str);
      },
      'zh-TW': function zhTW(str) {
        var ALPHABET_CODES = {
          A: 10,
          B: 11,
          C: 12,
          D: 13,
          E: 14,
          F: 15,
          G: 16,
          H: 17,
          I: 34,
          J: 18,
          K: 19,
          L: 20,
          M: 21,
          N: 22,
          O: 35,
          P: 23,
          Q: 24,
          R: 25,
          S: 26,
          T: 27,
          U: 28,
          V: 29,
          W: 32,
          X: 30,
          Y: 31,
          Z: 33
        };
        var sanitized = str.trim().toUpperCase();
        if (!/^[A-Z][0-9]{9}$/.test(sanitized)) return false;
        return Array.from(sanitized).reduce(function (sum, number, index) {
          if (index === 0) {
            var code = ALPHABET_CODES[number];
            return code % 10 * 9 + Math.floor(code / 10);
          }

          if (index === 9) {
            return (10 - sum % 10 - Number(number)) % 10 === 0;
          }

          return sum + Number(number) * (9 - index);
        }, 0);
      }
    };

    function isIdentityCard(str, locale) {
      (0, _assertString.default)(str);

      if (locale in validators) {
        return validators[locale](str);
      } else if (locale === 'any') {
        for (var key in validators) {
          // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes
          // istanbul ignore else
          if (validators.hasOwnProperty(key)) {
            var validator = validators[key];

            if (validator(str)) {
              return true;
            }
          }
        }

        return false;
      }

      throw new Error("Invalid locale '".concat(locale, "'"));
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isIdentityCard_1);

    var isEAN_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isEAN;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * The most commonly used EAN standard is
     * the thirteen-digit EAN-13, while the
     * less commonly used 8-digit EAN-8 barcode was
     * introduced for use on small packages.
     * EAN consists of:
     * GS1 prefix, manufacturer code, product code and check digit
     * Reference: https://en.wikipedia.org/wiki/International_Article_Number
     */

    /**
     * Define EAN Lenghts; 8 for EAN-8; 13 for EAN-13
     * and Regular Expression for valid EANs (EAN-8, EAN-13),
     * with exact numberic matching of 8 or 13 digits [0-9]
     */
    var LENGTH_EAN_8 = 8;
    var validEanRegex = /^(\d{8}|\d{13})$/;
    /**
     * Get position weight given:
     * EAN length and digit index/position
     *
     * @param {number} length
     * @param {number} index
     * @return {number}
     */

    function getPositionWeightThroughLengthAndIndex(length, index) {
      if (length === LENGTH_EAN_8) {
        return index % 2 === 0 ? 3 : 1;
      }

      return index % 2 === 0 ? 1 : 3;
    }
    /**
     * Calculate EAN Check Digit
     * Reference: https://en.wikipedia.org/wiki/International_Article_Number#Calculation_of_checksum_digit
     *
     * @param {string} ean
     * @return {number}
     */


    function calculateCheckDigit(ean) {
      var checksum = ean.slice(0, -1).split('').map(function (char, index) {
        return Number(char) * getPositionWeightThroughLengthAndIndex(ean.length, index);
      }).reduce(function (acc, partialSum) {
        return acc + partialSum;
      }, 0);
      var remainder = 10 - checksum % 10;
      return remainder < 10 ? remainder : 0;
    }
    /**
     * Check if string is valid EAN:
     * Matches EAN-8/EAN-13 regex
     * Has valid check digit.
     *
     * @param {string} str
     * @return {boolean}
     */


    function isEAN(str) {
      (0, _assertString.default)(str);
      var actualCheckDigit = Number(str.slice(-1));
      return validEanRegex.test(str) && actualCheckDigit === calculateCheckDigit(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isEAN_1);

    var isISIN_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isISIN;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var isin = /^[A-Z]{2}[0-9A-Z]{9}[0-9]$/;

    function isISIN(str) {
      (0, _assertString.default)(str);

      if (!isin.test(str)) {
        return false;
      }

      var checksumStr = str.replace(/[A-Z]/g, function (character) {
        return parseInt(character, 36);
      });
      var sum = 0;
      var digit;
      var tmpNum;
      var shouldDouble = true;

      for (var i = checksumStr.length - 2; i >= 0; i--) {
        digit = checksumStr.substring(i, i + 1);
        tmpNum = parseInt(digit, 10);

        if (shouldDouble) {
          tmpNum *= 2;

          if (tmpNum >= 10) {
            sum += tmpNum + 1;
          } else {
            sum += tmpNum;
          }
        } else {
          sum += tmpNum;
        }

        shouldDouble = !shouldDouble;
      }

      return parseInt(str.substr(str.length - 1), 10) === (10000 - sum) % 10;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isISIN_1);

    var isISBN_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isISBN;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var isbn10Maybe = /^(?:[0-9]{9}X|[0-9]{10})$/;
    var isbn13Maybe = /^(?:[0-9]{13})$/;
    var factor = [1, 3];

    function isISBN(str) {
      var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      (0, _assertString.default)(str);
      version = String(version);

      if (!version) {
        return isISBN(str, 10) || isISBN(str, 13);
      }

      var sanitized = str.replace(/[\s-]+/g, '');
      var checksum = 0;
      var i;

      if (version === '10') {
        if (!isbn10Maybe.test(sanitized)) {
          return false;
        }

        for (i = 0; i < 9; i++) {
          checksum += (i + 1) * sanitized.charAt(i);
        }

        if (sanitized.charAt(9) === 'X') {
          checksum += 10 * 10;
        } else {
          checksum += 10 * sanitized.charAt(9);
        }

        if (checksum % 11 === 0) {
          return !!sanitized;
        }
      } else if (version === '13') {
        if (!isbn13Maybe.test(sanitized)) {
          return false;
        }

        for (i = 0; i < 12; i++) {
          checksum += factor[i % 2] * sanitized.charAt(i);
        }

        if (sanitized.charAt(12) - (10 - checksum % 10) % 10 === 0) {
          return !!sanitized;
        }
      }

      return false;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isISBN_1);

    var isISSN_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isISSN;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var issn = '^\\d{4}-?\\d{3}[\\dX]$';

    function isISSN(str) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      (0, _assertString.default)(str);
      var testIssn = issn;
      testIssn = options.require_hyphen ? testIssn.replace('?', '') : testIssn;
      testIssn = options.case_sensitive ? new RegExp(testIssn) : new RegExp(testIssn, 'i');

      if (!testIssn.test(str)) {
        return false;
      }

      var digits = str.replace('-', '').toUpperCase();
      var checksum = 0;

      for (var i = 0; i < digits.length; i++) {
        var digit = digits[i];
        checksum += (digit === 'X' ? 10 : +digit) * (8 - i);
      }

      return checksum % 11 === 0;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isISSN_1);

    var algorithms = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.iso7064Check = iso7064Check;
    exports.luhnCheck = luhnCheck;
    exports.reverseMultiplyAndSum = reverseMultiplyAndSum;
    exports.verhoeffCheck = verhoeffCheck;

    /**
     * Algorithmic validation functions
     * May be used as is or implemented in the workflow of other validators.
     */

    /*
     * ISO 7064 validation function
     * Called with a string of numbers (incl. check digit)
     * to validate according to ISO 7064 (MOD 11, 10).
     */
    function iso7064Check(str) {
      var checkvalue = 10;

      for (var i = 0; i < str.length - 1; i++) {
        checkvalue = (parseInt(str[i], 10) + checkvalue) % 10 === 0 ? 10 * 2 % 11 : (parseInt(str[i], 10) + checkvalue) % 10 * 2 % 11;
      }

      checkvalue = checkvalue === 1 ? 0 : 11 - checkvalue;
      return checkvalue === parseInt(str[10], 10);
    }
    /*
     * Luhn (mod 10) validation function
     * Called with a string of numbers (incl. check digit)
     * to validate according to the Luhn algorithm.
     */


    function luhnCheck(str) {
      var checksum = 0;
      var second = false;

      for (var i = str.length - 1; i >= 0; i--) {
        if (second) {
          var product = parseInt(str[i], 10) * 2;

          if (product > 9) {
            // sum digits of product and add to checksum
            checksum += product.toString().split('').map(function (a) {
              return parseInt(a, 10);
            }).reduce(function (a, b) {
              return a + b;
            }, 0);
          } else {
            checksum += product;
          }
        } else {
          checksum += parseInt(str[i], 10);
        }

        second = !second;
      }

      return checksum % 10 === 0;
    }
    /*
     * Reverse TIN multiplication and summation helper function
     * Called with an array of single-digit integers and a base multiplier
     * to calculate the sum of the digits multiplied in reverse.
     * Normally used in variations of MOD 11 algorithmic checks.
     */


    function reverseMultiplyAndSum(digits, base) {
      var total = 0;

      for (var i = 0; i < digits.length; i++) {
        total += digits[i] * (base - i);
      }

      return total;
    }
    /*
     * Verhoeff validation helper function
     * Called with a string of numbers
     * to validate according to the Verhoeff algorithm.
     */


    function verhoeffCheck(str) {
      var d_table = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]];
      var p_table = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]]; // Copy (to prevent replacement) and reverse

      var str_copy = str.split('').reverse().join('');
      var checksum = 0;

      for (var i = 0; i < str_copy.length; i++) {
        checksum = d_table[checksum][p_table[i % 8][parseInt(str_copy[i], 10)]];
      }

      return checksum === 0;
    }
    });

    unwrapExports(algorithms);
    algorithms.iso7064Check;
    algorithms.luhnCheck;
    algorithms.reverseMultiplyAndSum;
    algorithms.verhoeffCheck;

    var isTaxID_1 = createCommonjsModule(function (module, exports) {

    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isTaxID;

    var _assertString = _interopRequireDefault(assertString_1);

    var algorithms$1 = _interopRequireWildcard(algorithms);

    var _isDate = _interopRequireDefault(isDate_1);

    function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

    function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

    function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

    function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

    function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    /**
     * TIN Validation
     * Validates Tax Identification Numbers (TINs) from the US, EU member states and the United Kingdom.
     *
     * EU-UK:
     * National TIN validity is calculated using public algorithms as made available by DG TAXUD.
     *
     * See `https://ec.europa.eu/taxation_customs/tin/specs/FS-TIN%20Algorithms-Public.docx` for more information.
     *
     * US:
     * An Employer Identification Number (EIN), also known as a Federal Tax Identification Number,
     *  is used to identify a business entity.
     *
     * NOTES:
     *  - Prefix 47 is being reserved for future use
     *  - Prefixes 26, 27, 45, 46 and 47 were previously assigned by the Philadelphia campus.
     *
     * See `http://www.irs.gov/Businesses/Small-Businesses-&-Self-Employed/How-EINs-are-Assigned-and-Valid-EIN-Prefixes`
     * for more information.
     */
    // Locale functions

    /*
     * bg-BG validation function
     * (Edinen graždanski nomer (EGN/ЕГН), persons only)
     * Checks if birth date (first six digits) is valid and calculates check (last) digit
     */
    function bgBgCheck(tin) {
      // Extract full year, normalize month and check birth date validity
      var century_year = tin.slice(0, 2);
      var month = parseInt(tin.slice(2, 4), 10);

      if (month > 40) {
        month -= 40;
        century_year = "20".concat(century_year);
      } else if (month > 20) {
        month -= 20;
        century_year = "18".concat(century_year);
      } else {
        century_year = "19".concat(century_year);
      }

      if (month < 10) {
        month = "0".concat(month);
      }

      var date = "".concat(century_year, "/").concat(month, "/").concat(tin.slice(4, 6));

      if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
        return false;
      } // split digits into an array for further processing


      var digits = tin.split('').map(function (a) {
        return parseInt(a, 10);
      }); // Calculate checksum by multiplying digits with fixed values

      var multip_lookup = [2, 4, 8, 5, 10, 9, 7, 3, 6];
      var checksum = 0;

      for (var i = 0; i < multip_lookup.length; i++) {
        checksum += digits[i] * multip_lookup[i];
      }

      checksum = checksum % 11 === 10 ? 0 : checksum % 11;
      return checksum === digits[9];
    }
    /*
     * cs-CZ validation function
     * (Rodné číslo (RČ), persons only)
     * Checks if birth date (first six digits) is valid and divisibility by 11
     * Material not in DG TAXUD document sourced from:
     * -`https://lorenc.info/3MA381/overeni-spravnosti-rodneho-cisla.htm`
     * -`https://www.mvcr.cz/clanek/rady-a-sluzby-dokumenty-rodne-cislo.aspx`
     */


    function csCzCheck(tin) {
      tin = tin.replace(/\W/, ''); // Extract full year from TIN length

      var full_year = parseInt(tin.slice(0, 2), 10);

      if (tin.length === 10) {
        if (full_year < 54) {
          full_year = "20".concat(full_year);
        } else {
          full_year = "19".concat(full_year);
        }
      } else {
        if (tin.slice(6) === '000') {
          return false;
        } // Three-zero serial not assigned before 1954


        if (full_year < 54) {
          full_year = "19".concat(full_year);
        } else {
          return false; // No 18XX years seen in any of the resources
        }
      } // Add missing zero if needed


      if (full_year.length === 3) {
        full_year = [full_year.slice(0, 2), '0', full_year.slice(2)].join('');
      } // Extract month from TIN and normalize


      var month = parseInt(tin.slice(2, 4), 10);

      if (month > 50) {
        month -= 50;
      }

      if (month > 20) {
        // Month-plus-twenty was only introduced in 2004
        if (parseInt(full_year, 10) < 2004) {
          return false;
        }

        month -= 20;
      }

      if (month < 10) {
        month = "0".concat(month);
      } // Check date validity


      var date = "".concat(full_year, "/").concat(month, "/").concat(tin.slice(4, 6));

      if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
        return false;
      } // Verify divisibility by 11


      if (tin.length === 10) {
        if (parseInt(tin, 10) % 11 !== 0) {
          // Some numbers up to and including 1985 are still valid if
          // check (last) digit equals 0 and modulo of first 9 digits equals 10
          var checkdigit = parseInt(tin.slice(0, 9), 10) % 11;

          if (parseInt(full_year, 10) < 1986 && checkdigit === 10) {
            if (parseInt(tin.slice(9), 10) !== 0) {
              return false;
            }
          } else {
            return false;
          }
        }
      }

      return true;
    }
    /*
     * de-AT validation function
     * (Abgabenkontonummer, persons/entities)
     * Verify TIN validity by calling luhnCheck()
     */


    function deAtCheck(tin) {
      return algorithms$1.luhnCheck(tin);
    }
    /*
     * de-DE validation function
     * (Steueridentifikationsnummer (Steuer-IdNr.), persons only)
     * Tests for single duplicate/triplicate value, then calculates ISO 7064 check (last) digit
     * Partial implementation of spec (same result with both algorithms always)
     */


    function deDeCheck(tin) {
      // Split digits into an array for further processing
      var digits = tin.split('').map(function (a) {
        return parseInt(a, 10);
      }); // Fill array with strings of number positions

      var occurences = [];

      for (var i = 0; i < digits.length - 1; i++) {
        occurences.push('');

        for (var j = 0; j < digits.length - 1; j++) {
          if (digits[i] === digits[j]) {
            occurences[i] += j;
          }
        }
      } // Remove digits with one occurence and test for only one duplicate/triplicate


      occurences = occurences.filter(function (a) {
        return a.length > 1;
      });

      if (occurences.length !== 2 && occurences.length !== 3) {
        return false;
      } // In case of triplicate value only two digits are allowed next to each other


      if (occurences[0].length === 3) {
        var trip_locations = occurences[0].split('').map(function (a) {
          return parseInt(a, 10);
        });
        var recurrent = 0; // Amount of neighbour occurences

        for (var _i = 0; _i < trip_locations.length - 1; _i++) {
          if (trip_locations[_i] + 1 === trip_locations[_i + 1]) {
            recurrent += 1;
          }
        }

        if (recurrent === 2) {
          return false;
        }
      }

      return algorithms$1.iso7064Check(tin);
    }
    /*
     * dk-DK validation function
     * (CPR-nummer (personnummer), persons only)
     * Checks if birth date (first six digits) is valid and assigned to century (seventh) digit,
     * and calculates check (last) digit
     */


    function dkDkCheck(tin) {
      tin = tin.replace(/\W/, ''); // Extract year, check if valid for given century digit and add century

      var year = parseInt(tin.slice(4, 6), 10);
      var century_digit = tin.slice(6, 7);

      switch (century_digit) {
        case '0':
        case '1':
        case '2':
        case '3':
          year = "19".concat(year);
          break;

        case '4':
        case '9':
          if (year < 37) {
            year = "20".concat(year);
          } else {
            year = "19".concat(year);
          }

          break;

        default:
          if (year < 37) {
            year = "20".concat(year);
          } else if (year > 58) {
            year = "18".concat(year);
          } else {
            return false;
          }

          break;
      } // Add missing zero if needed


      if (year.length === 3) {
        year = [year.slice(0, 2), '0', year.slice(2)].join('');
      } // Check date validity


      var date = "".concat(year, "/").concat(tin.slice(2, 4), "/").concat(tin.slice(0, 2));

      if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
        return false;
      } // Split digits into an array for further processing


      var digits = tin.split('').map(function (a) {
        return parseInt(a, 10);
      });
      var checksum = 0;
      var weight = 4; // Multiply by weight and add to checksum

      for (var i = 0; i < 9; i++) {
        checksum += digits[i] * weight;
        weight -= 1;

        if (weight === 1) {
          weight = 7;
        }
      }

      checksum %= 11;

      if (checksum === 1) {
        return false;
      }

      return checksum === 0 ? digits[9] === 0 : digits[9] === 11 - checksum;
    }
    /*
     * el-CY validation function
     * (Arithmos Forologikou Mitroou (AFM/ΑΦΜ), persons only)
     * Verify TIN validity by calculating ASCII value of check (last) character
     */


    function elCyCheck(tin) {
      // split digits into an array for further processing
      var digits = tin.slice(0, 8).split('').map(function (a) {
        return parseInt(a, 10);
      });
      var checksum = 0; // add digits in even places

      for (var i = 1; i < digits.length; i += 2) {
        checksum += digits[i];
      } // add digits in odd places


      for (var _i2 = 0; _i2 < digits.length; _i2 += 2) {
        if (digits[_i2] < 2) {
          checksum += 1 - digits[_i2];
        } else {
          checksum += 2 * (digits[_i2] - 2) + 5;

          if (digits[_i2] > 4) {
            checksum += 2;
          }
        }
      }

      return String.fromCharCode(checksum % 26 + 65) === tin.charAt(8);
    }
    /*
     * el-GR validation function
     * (Arithmos Forologikou Mitroou (AFM/ΑΦΜ), persons/entities)
     * Verify TIN validity by calculating check (last) digit
     * Algorithm not in DG TAXUD document- sourced from:
     * - `http://epixeirisi.gr/%CE%9A%CE%A1%CE%99%CE%A3%CE%99%CE%9C%CE%91-%CE%98%CE%95%CE%9C%CE%91%CE%A4%CE%91-%CE%A6%CE%9F%CE%A1%CE%9F%CE%9B%CE%9F%CE%93%CE%99%CE%91%CE%A3-%CE%9A%CE%91%CE%99-%CE%9B%CE%9F%CE%93%CE%99%CE%A3%CE%A4%CE%99%CE%9A%CE%97%CE%A3/23791/%CE%91%CF%81%CE%B9%CE%B8%CE%BC%CF%8C%CF%82-%CE%A6%CE%BF%CF%81%CE%BF%CE%BB%CE%BF%CE%B3%CE%B9%CE%BA%CE%BF%CF%8D-%CE%9C%CE%B7%CF%84%CF%81%CF%8E%CE%BF%CF%85`
     */


    function elGrCheck(tin) {
      // split digits into an array for further processing
      var digits = tin.split('').map(function (a) {
        return parseInt(a, 10);
      });
      var checksum = 0;

      for (var i = 0; i < 8; i++) {
        checksum += digits[i] * Math.pow(2, 8 - i);
      }

      return checksum % 11 === digits[8];
    }
    /*
     * en-GB validation function (should go here if needed)
     * (National Insurance Number (NINO) or Unique Taxpayer Reference (UTR),
     * persons/entities respectively)
     */

    /*
     * en-IE validation function
     * (Personal Public Service Number (PPS No), persons only)
     * Verify TIN validity by calculating check (second to last) character
     */


    function enIeCheck(tin) {
      var checksum = algorithms$1.reverseMultiplyAndSum(tin.split('').slice(0, 7).map(function (a) {
        return parseInt(a, 10);
      }), 8);

      if (tin.length === 9 && tin[8] !== 'W') {
        checksum += (tin[8].charCodeAt(0) - 64) * 9;
      }

      checksum %= 23;

      if (checksum === 0) {
        return tin[7].toUpperCase() === 'W';
      }

      return tin[7].toUpperCase() === String.fromCharCode(64 + checksum);
    } // Valid US IRS campus prefixes


    var enUsCampusPrefix = {
      andover: ['10', '12'],
      atlanta: ['60', '67'],
      austin: ['50', '53'],
      brookhaven: ['01', '02', '03', '04', '05', '06', '11', '13', '14', '16', '21', '22', '23', '25', '34', '51', '52', '54', '55', '56', '57', '58', '59', '65'],
      cincinnati: ['30', '32', '35', '36', '37', '38', '61'],
      fresno: ['15', '24'],
      internet: ['20', '26', '27', '45', '46', '47'],
      kansas: ['40', '44'],
      memphis: ['94', '95'],
      ogden: ['80', '90'],
      philadelphia: ['33', '39', '41', '42', '43', '46', '48', '62', '63', '64', '66', '68', '71', '72', '73', '74', '75', '76', '77', '81', '82', '83', '84', '85', '86', '87', '88', '91', '92', '93', '98', '99'],
      sba: ['31']
    }; // Return an array of all US IRS campus prefixes

    function enUsGetPrefixes() {
      var prefixes = [];

      for (var location in enUsCampusPrefix) {
        // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes
        // istanbul ignore else
        if (enUsCampusPrefix.hasOwnProperty(location)) {
          prefixes.push.apply(prefixes, _toConsumableArray(enUsCampusPrefix[location]));
        }
      }

      return prefixes;
    }
    /*
     * en-US validation function
     * Verify that the TIN starts with a valid IRS campus prefix
     */


    function enUsCheck(tin) {
      return enUsGetPrefixes().indexOf(tin.substr(0, 2)) !== -1;
    }
    /*
     * es-ES validation function
     * (Documento Nacional de Identidad (DNI)
     * or Número de Identificación de Extranjero (NIE), persons only)
     * Verify TIN validity by calculating check (last) character
     */


    function esEsCheck(tin) {
      // Split characters into an array for further processing
      var chars = tin.toUpperCase().split(''); // Replace initial letter if needed

      if (isNaN(parseInt(chars[0], 10)) && chars.length > 1) {
        var lead_replace = 0;

        switch (chars[0]) {
          case 'Y':
            lead_replace = 1;
            break;

          case 'Z':
            lead_replace = 2;
            break;
        }

        chars.splice(0, 1, lead_replace); // Fill with zeros if smaller than proper
      } else {
        while (chars.length < 9) {
          chars.unshift(0);
        }
      } // Calculate checksum and check according to lookup


      var lookup = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E'];
      chars = chars.join('');
      var checksum = parseInt(chars.slice(0, 8), 10) % 23;
      return chars[8] === lookup[checksum];
    }
    /*
     * et-EE validation function
     * (Isikukood (IK), persons only)
     * Checks if birth date (century digit and six following) is valid and calculates check (last) digit
     * Material not in DG TAXUD document sourced from:
     * - `https://www.oecd.org/tax/automatic-exchange/crs-implementation-and-assistance/tax-identification-numbers/Estonia-TIN.pdf`
     */


    function etEeCheck(tin) {
      // Extract year and add century
      var full_year = tin.slice(1, 3);
      var century_digit = tin.slice(0, 1);

      switch (century_digit) {
        case '1':
        case '2':
          full_year = "18".concat(full_year);
          break;

        case '3':
        case '4':
          full_year = "19".concat(full_year);
          break;

        default:
          full_year = "20".concat(full_year);
          break;
      } // Check date validity


      var date = "".concat(full_year, "/").concat(tin.slice(3, 5), "/").concat(tin.slice(5, 7));

      if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
        return false;
      } // Split digits into an array for further processing


      var digits = tin.split('').map(function (a) {
        return parseInt(a, 10);
      });
      var checksum = 0;
      var weight = 1; // Multiply by weight and add to checksum

      for (var i = 0; i < 10; i++) {
        checksum += digits[i] * weight;
        weight += 1;

        if (weight === 10) {
          weight = 1;
        }
      } // Do again if modulo 11 of checksum is 10


      if (checksum % 11 === 10) {
        checksum = 0;
        weight = 3;

        for (var _i3 = 0; _i3 < 10; _i3++) {
          checksum += digits[_i3] * weight;
          weight += 1;

          if (weight === 10) {
            weight = 1;
          }
        }

        if (checksum % 11 === 10) {
          return digits[10] === 0;
        }
      }

      return checksum % 11 === digits[10];
    }
    /*
     * fi-FI validation function
     * (Henkilötunnus (HETU), persons only)
     * Checks if birth date (first six digits plus century symbol) is valid
     * and calculates check (last) digit
     */


    function fiFiCheck(tin) {
      // Extract year and add century
      var full_year = tin.slice(4, 6);
      var century_symbol = tin.slice(6, 7);

      switch (century_symbol) {
        case '+':
          full_year = "18".concat(full_year);
          break;

        case '-':
          full_year = "19".concat(full_year);
          break;

        default:
          full_year = "20".concat(full_year);
          break;
      } // Check date validity


      var date = "".concat(full_year, "/").concat(tin.slice(2, 4), "/").concat(tin.slice(0, 2));

      if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
        return false;
      } // Calculate check character


      var checksum = parseInt(tin.slice(0, 6) + tin.slice(7, 10), 10) % 31;

      if (checksum < 10) {
        return checksum === parseInt(tin.slice(10), 10);
      }

      checksum -= 10;
      var letters_lookup = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];
      return letters_lookup[checksum] === tin.slice(10);
    }
    /*
     * fr/nl-BE validation function
     * (Numéro national (N.N.), persons only)
     * Checks if birth date (first six digits) is valid and calculates check (last two) digits
     */


    function frBeCheck(tin) {
      // Zero month/day value is acceptable
      if (tin.slice(2, 4) !== '00' || tin.slice(4, 6) !== '00') {
        // Extract date from first six digits of TIN
        var date = "".concat(tin.slice(0, 2), "/").concat(tin.slice(2, 4), "/").concat(tin.slice(4, 6));

        if (!(0, _isDate.default)(date, 'YY/MM/DD')) {
          return false;
        }
      }

      var checksum = 97 - parseInt(tin.slice(0, 9), 10) % 97;
      var checkdigits = parseInt(tin.slice(9, 11), 10);

      if (checksum !== checkdigits) {
        checksum = 97 - parseInt("2".concat(tin.slice(0, 9)), 10) % 97;

        if (checksum !== checkdigits) {
          return false;
        }
      }

      return true;
    }
    /*
     * fr-FR validation function
     * (Numéro fiscal de référence (numéro SPI), persons only)
     * Verify TIN validity by calculating check (last three) digits
     */


    function frFrCheck(tin) {
      tin = tin.replace(/\s/g, '');
      var checksum = parseInt(tin.slice(0, 10), 10) % 511;
      var checkdigits = parseInt(tin.slice(10, 13), 10);
      return checksum === checkdigits;
    }
    /*
     * fr/lb-LU validation function
     * (numéro d’identification personnelle, persons only)
     * Verify birth date validity and run Luhn and Verhoeff checks
     */


    function frLuCheck(tin) {
      // Extract date and check validity
      var date = "".concat(tin.slice(0, 4), "/").concat(tin.slice(4, 6), "/").concat(tin.slice(6, 8));

      if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
        return false;
      } // Run Luhn check


      if (!algorithms$1.luhnCheck(tin.slice(0, 12))) {
        return false;
      } // Remove Luhn check digit and run Verhoeff check


      return algorithms$1.verhoeffCheck("".concat(tin.slice(0, 11)).concat(tin[12]));
    }
    /*
     * hr-HR validation function
     * (Osobni identifikacijski broj (OIB), persons/entities)
     * Verify TIN validity by calling iso7064Check(digits)
     */


    function hrHrCheck(tin) {
      return algorithms$1.iso7064Check(tin);
    }
    /*
     * hu-HU validation function
     * (Adóazonosító jel, persons only)
     * Verify TIN validity by calculating check (last) digit
     */


    function huHuCheck(tin) {
      // split digits into an array for further processing
      var digits = tin.split('').map(function (a) {
        return parseInt(a, 10);
      });
      var checksum = 8;

      for (var i = 1; i < 9; i++) {
        checksum += digits[i] * (i + 1);
      }

      return checksum % 11 === digits[9];
    }
    /*
     * lt-LT validation function (should go here if needed)
     * (Asmens kodas, persons/entities respectively)
     * Current validation check is alias of etEeCheck- same format applies
     */

    /*
     * it-IT first/last name validity check
     * Accepts it-IT TIN-encoded names as a three-element character array and checks their validity
     * Due to lack of clarity between resources ("Are only Italian consonants used?
     * What happens if a person has X in their name?" etc.) only two test conditions
     * have been implemented:
     * Vowels may only be followed by other vowels or an X character
     * and X characters after vowels may only be followed by other X characters.
     */


    function itItNameCheck(name) {
      // true at the first occurence of a vowel
      var vowelflag = false; // true at the first occurence of an X AFTER vowel
      // (to properly handle last names with X as consonant)

      var xflag = false;

      for (var i = 0; i < 3; i++) {
        if (!vowelflag && /[AEIOU]/.test(name[i])) {
          vowelflag = true;
        } else if (!xflag && vowelflag && name[i] === 'X') {
          xflag = true;
        } else if (i > 0) {
          if (vowelflag && !xflag) {
            if (!/[AEIOU]/.test(name[i])) {
              return false;
            }
          }

          if (xflag) {
            if (!/X/.test(name[i])) {
              return false;
            }
          }
        }
      }

      return true;
    }
    /*
     * it-IT validation function
     * (Codice fiscale (TIN-IT), persons only)
     * Verify name, birth date and codice catastale validity
     * and calculate check character.
     * Material not in DG-TAXUD document sourced from:
     * `https://en.wikipedia.org/wiki/Italian_fiscal_code`
     */


    function itItCheck(tin) {
      // Capitalize and split characters into an array for further processing
      var chars = tin.toUpperCase().split(''); // Check first and last name validity calling itItNameCheck()

      if (!itItNameCheck(chars.slice(0, 3))) {
        return false;
      }

      if (!itItNameCheck(chars.slice(3, 6))) {
        return false;
      } // Convert letters in number spaces back to numbers if any


      var number_locations = [6, 7, 9, 10, 12, 13, 14];
      var number_replace = {
        L: '0',
        M: '1',
        N: '2',
        P: '3',
        Q: '4',
        R: '5',
        S: '6',
        T: '7',
        U: '8',
        V: '9'
      };

      for (var _i4 = 0, _number_locations = number_locations; _i4 < _number_locations.length; _i4++) {
        var i = _number_locations[_i4];

        if (chars[i] in number_replace) {
          chars.splice(i, 1, number_replace[chars[i]]);
        }
      } // Extract month and day, and check date validity


      var month_replace = {
        A: '01',
        B: '02',
        C: '03',
        D: '04',
        E: '05',
        H: '06',
        L: '07',
        M: '08',
        P: '09',
        R: '10',
        S: '11',
        T: '12'
      };
      var month = month_replace[chars[8]];
      var day = parseInt(chars[9] + chars[10], 10);

      if (day > 40) {
        day -= 40;
      }

      if (day < 10) {
        day = "0".concat(day);
      }

      var date = "".concat(chars[6]).concat(chars[7], "/").concat(month, "/").concat(day);

      if (!(0, _isDate.default)(date, 'YY/MM/DD')) {
        return false;
      } // Calculate check character by adding up even and odd characters as numbers


      var checksum = 0;

      for (var _i5 = 1; _i5 < chars.length - 1; _i5 += 2) {
        var char_to_int = parseInt(chars[_i5], 10);

        if (isNaN(char_to_int)) {
          char_to_int = chars[_i5].charCodeAt(0) - 65;
        }

        checksum += char_to_int;
      }

      var odd_convert = {
        // Maps of characters at odd places
        A: 1,
        B: 0,
        C: 5,
        D: 7,
        E: 9,
        F: 13,
        G: 15,
        H: 17,
        I: 19,
        J: 21,
        K: 2,
        L: 4,
        M: 18,
        N: 20,
        O: 11,
        P: 3,
        Q: 6,
        R: 8,
        S: 12,
        T: 14,
        U: 16,
        V: 10,
        W: 22,
        X: 25,
        Y: 24,
        Z: 23,
        0: 1,
        1: 0
      };

      for (var _i6 = 0; _i6 < chars.length - 1; _i6 += 2) {
        var _char_to_int = 0;

        if (chars[_i6] in odd_convert) {
          _char_to_int = odd_convert[chars[_i6]];
        } else {
          var multiplier = parseInt(chars[_i6], 10);
          _char_to_int = 2 * multiplier + 1;

          if (multiplier > 4) {
            _char_to_int += 2;
          }
        }

        checksum += _char_to_int;
      }

      if (String.fromCharCode(65 + checksum % 26) !== chars[15]) {
        return false;
      }

      return true;
    }
    /*
     * lv-LV validation function
     * (Personas kods (PK), persons only)
     * Check validity of birth date and calculate check (last) digit
     * Support only for old format numbers (not starting with '32', issued before 2017/07/01)
     * Material not in DG TAXUD document sourced from:
     * `https://boot.ritakafija.lv/forums/index.php?/topic/88314-personas-koda-algoritms-%C4%8Deksumma/`
     */


    function lvLvCheck(tin) {
      tin = tin.replace(/\W/, ''); // Extract date from TIN

      var day = tin.slice(0, 2);

      if (day !== '32') {
        // No date/checksum check if new format
        var month = tin.slice(2, 4);

        if (month !== '00') {
          // No date check if unknown month
          var full_year = tin.slice(4, 6);

          switch (tin[6]) {
            case '0':
              full_year = "18".concat(full_year);
              break;

            case '1':
              full_year = "19".concat(full_year);
              break;

            default:
              full_year = "20".concat(full_year);
              break;
          } // Check date validity


          var date = "".concat(full_year, "/").concat(tin.slice(2, 4), "/").concat(day);

          if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
            return false;
          }
        } // Calculate check digit


        var checksum = 1101;
        var multip_lookup = [1, 6, 3, 7, 9, 10, 5, 8, 4, 2];

        for (var i = 0; i < tin.length - 1; i++) {
          checksum -= parseInt(tin[i], 10) * multip_lookup[i];
        }

        return parseInt(tin[10], 10) === checksum % 11;
      }

      return true;
    }
    /*
     * mt-MT validation function
     * (Identity Card Number or Unique Taxpayer Reference, persons/entities)
     * Verify Identity Card Number structure (no other tests found)
     */


    function mtMtCheck(tin) {
      if (tin.length !== 9) {
        // No tests for UTR
        var chars = tin.toUpperCase().split(''); // Fill with zeros if smaller than proper

        while (chars.length < 8) {
          chars.unshift(0);
        } // Validate format according to last character


        switch (tin[7]) {
          case 'A':
          case 'P':
            if (parseInt(chars[6], 10) === 0) {
              return false;
            }

            break;

          default:
            {
              var first_part = parseInt(chars.join('').slice(0, 5), 10);

              if (first_part > 32000) {
                return false;
              }

              var second_part = parseInt(chars.join('').slice(5, 7), 10);

              if (first_part === second_part) {
                return false;
              }
            }
        }
      }

      return true;
    }
    /*
     * nl-NL validation function
     * (Burgerservicenummer (BSN) or Rechtspersonen Samenwerkingsverbanden Informatie Nummer (RSIN),
     * persons/entities respectively)
     * Verify TIN validity by calculating check (last) digit (variant of MOD 11)
     */


    function nlNlCheck(tin) {
      return algorithms$1.reverseMultiplyAndSum(tin.split('').slice(0, 8).map(function (a) {
        return parseInt(a, 10);
      }), 9) % 11 === parseInt(tin[8], 10);
    }
    /*
     * pl-PL validation function
     * (Powszechny Elektroniczny System Ewidencji Ludności (PESEL)
     * or Numer identyfikacji podatkowej (NIP), persons/entities)
     * Verify TIN validity by validating birth date (PESEL) and calculating check (last) digit
     */


    function plPlCheck(tin) {
      // NIP
      if (tin.length === 10) {
        // Calculate last digit by multiplying with lookup
        var lookup = [6, 5, 7, 2, 3, 4, 5, 6, 7];
        var _checksum = 0;

        for (var i = 0; i < lookup.length; i++) {
          _checksum += parseInt(tin[i], 10) * lookup[i];
        }

        _checksum %= 11;

        if (_checksum === 10) {
          return false;
        }

        return _checksum === parseInt(tin[9], 10);
      } // PESEL
      // Extract full year using month


      var full_year = tin.slice(0, 2);
      var month = parseInt(tin.slice(2, 4), 10);

      if (month > 80) {
        full_year = "18".concat(full_year);
        month -= 80;
      } else if (month > 60) {
        full_year = "22".concat(full_year);
        month -= 60;
      } else if (month > 40) {
        full_year = "21".concat(full_year);
        month -= 40;
      } else if (month > 20) {
        full_year = "20".concat(full_year);
        month -= 20;
      } else {
        full_year = "19".concat(full_year);
      } // Add leading zero to month if needed


      if (month < 10) {
        month = "0".concat(month);
      } // Check date validity


      var date = "".concat(full_year, "/").concat(month, "/").concat(tin.slice(4, 6));

      if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
        return false;
      } // Calculate last digit by mulitplying with odd one-digit numbers except 5


      var checksum = 0;
      var multiplier = 1;

      for (var _i7 = 0; _i7 < tin.length - 1; _i7++) {
        checksum += parseInt(tin[_i7], 10) * multiplier % 10;
        multiplier += 2;

        if (multiplier > 10) {
          multiplier = 1;
        } else if (multiplier === 5) {
          multiplier += 2;
        }
      }

      checksum = 10 - checksum % 10;
      return checksum === parseInt(tin[10], 10);
    }
    /*
     * pt-PT validation function
     * (Número de identificação fiscal (NIF), persons/entities)
     * Verify TIN validity by calculating check (last) digit (variant of MOD 11)
     */


    function ptPtCheck(tin) {
      var checksum = 11 - algorithms$1.reverseMultiplyAndSum(tin.split('').slice(0, 8).map(function (a) {
        return parseInt(a, 10);
      }), 9) % 11;

      if (checksum > 9) {
        return parseInt(tin[8], 10) === 0;
      }

      return checksum === parseInt(tin[8], 10);
    }
    /*
     * ro-RO validation function
     * (Cod Numeric Personal (CNP) or Cod de înregistrare fiscală (CIF),
     * persons only)
     * Verify CNP validity by calculating check (last) digit (test not found for CIF)
     * Material not in DG TAXUD document sourced from:
     * `https://en.wikipedia.org/wiki/National_identification_number#Romania`
     */


    function roRoCheck(tin) {
      if (tin.slice(0, 4) !== '9000') {
        // No test found for this format
        // Extract full year using century digit if possible
        var full_year = tin.slice(1, 3);

        switch (tin[0]) {
          case '1':
          case '2':
            full_year = "19".concat(full_year);
            break;

          case '3':
          case '4':
            full_year = "18".concat(full_year);
            break;

          case '5':
          case '6':
            full_year = "20".concat(full_year);
            break;
        } // Check date validity


        var date = "".concat(full_year, "/").concat(tin.slice(3, 5), "/").concat(tin.slice(5, 7));

        if (date.length === 8) {
          if (!(0, _isDate.default)(date, 'YY/MM/DD')) {
            return false;
          }
        } else if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
          return false;
        } // Calculate check digit


        var digits = tin.split('').map(function (a) {
          return parseInt(a, 10);
        });
        var multipliers = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
        var checksum = 0;

        for (var i = 0; i < multipliers.length; i++) {
          checksum += digits[i] * multipliers[i];
        }

        if (checksum % 11 === 10) {
          return digits[12] === 1;
        }

        return digits[12] === checksum % 11;
      }

      return true;
    }
    /*
     * sk-SK validation function
     * (Rodné číslo (RČ) or bezvýznamové identifikačné číslo (BIČ), persons only)
     * Checks validity of pre-1954 birth numbers (rodné číslo) only
     * Due to the introduction of the pseudo-random BIČ it is not possible to test
     * post-1954 birth numbers without knowing whether they are BIČ or RČ beforehand
     */


    function skSkCheck(tin) {
      if (tin.length === 9) {
        tin = tin.replace(/\W/, '');

        if (tin.slice(6) === '000') {
          return false;
        } // Three-zero serial not assigned before 1954
        // Extract full year from TIN length


        var full_year = parseInt(tin.slice(0, 2), 10);

        if (full_year > 53) {
          return false;
        }

        if (full_year < 10) {
          full_year = "190".concat(full_year);
        } else {
          full_year = "19".concat(full_year);
        } // Extract month from TIN and normalize


        var month = parseInt(tin.slice(2, 4), 10);

        if (month > 50) {
          month -= 50;
        }

        if (month < 10) {
          month = "0".concat(month);
        } // Check date validity


        var date = "".concat(full_year, "/").concat(month, "/").concat(tin.slice(4, 6));

        if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
          return false;
        }
      }

      return true;
    }
    /*
     * sl-SI validation function
     * (Davčna številka, persons/entities)
     * Verify TIN validity by calculating check (last) digit (variant of MOD 11)
     */


    function slSiCheck(tin) {
      var checksum = 11 - algorithms$1.reverseMultiplyAndSum(tin.split('').slice(0, 7).map(function (a) {
        return parseInt(a, 10);
      }), 8) % 11;

      if (checksum === 10) {
        return parseInt(tin[7], 10) === 0;
      }

      return checksum === parseInt(tin[7], 10);
    }
    /*
     * sv-SE validation function
     * (Personnummer or samordningsnummer, persons only)
     * Checks validity of birth date and calls luhnCheck() to validate check (last) digit
     */


    function svSeCheck(tin) {
      // Make copy of TIN and normalize to two-digit year form
      var tin_copy = tin.slice(0);

      if (tin.length > 11) {
        tin_copy = tin_copy.slice(2);
      } // Extract date of birth


      var full_year = '';
      var month = tin_copy.slice(2, 4);
      var day = parseInt(tin_copy.slice(4, 6), 10);

      if (tin.length > 11) {
        full_year = tin.slice(0, 4);
      } else {
        full_year = tin.slice(0, 2);

        if (tin.length === 11 && day < 60) {
          // Extract full year from centenarian symbol
          // Should work just fine until year 10000 or so
          var current_year = new Date().getFullYear().toString();
          var current_century = parseInt(current_year.slice(0, 2), 10);
          current_year = parseInt(current_year, 10);

          if (tin[6] === '-') {
            if (parseInt("".concat(current_century).concat(full_year), 10) > current_year) {
              full_year = "".concat(current_century - 1).concat(full_year);
            } else {
              full_year = "".concat(current_century).concat(full_year);
            }
          } else {
            full_year = "".concat(current_century - 1).concat(full_year);

            if (current_year - parseInt(full_year, 10) < 100) {
              return false;
            }
          }
        }
      } // Normalize day and check date validity


      if (day > 60) {
        day -= 60;
      }

      if (day < 10) {
        day = "0".concat(day);
      }

      var date = "".concat(full_year, "/").concat(month, "/").concat(day);

      if (date.length === 8) {
        if (!(0, _isDate.default)(date, 'YY/MM/DD')) {
          return false;
        }
      } else if (!(0, _isDate.default)(date, 'YYYY/MM/DD')) {
        return false;
      }

      return algorithms$1.luhnCheck(tin.replace(/\W/, ''));
    } // Locale lookup objects

    /*
     * Tax id regex formats for various locales
     *
     * Where not explicitly specified in DG-TAXUD document both
     * uppercase and lowercase letters are acceptable.
     */


    var taxIdFormat = {
      'bg-BG': /^\d{10}$/,
      'cs-CZ': /^\d{6}\/{0,1}\d{3,4}$/,
      'de-AT': /^\d{9}$/,
      'de-DE': /^[1-9]\d{10}$/,
      'dk-DK': /^\d{6}-{0,1}\d{4}$/,
      'el-CY': /^[09]\d{7}[A-Z]$/,
      'el-GR': /^([0-4]|[7-9])\d{8}$/,
      'en-GB': /^\d{10}$|^(?!GB|NK|TN|ZZ)(?![DFIQUV])[A-Z](?![DFIQUVO])[A-Z]\d{6}[ABCD ]$/i,
      'en-IE': /^\d{7}[A-W][A-IW]{0,1}$/i,
      'en-US': /^\d{2}[- ]{0,1}\d{7}$/,
      'es-ES': /^(\d{0,8}|[XYZKLM]\d{7})[A-HJ-NP-TV-Z]$/i,
      'et-EE': /^[1-6]\d{6}(00[1-9]|0[1-9][0-9]|[1-6][0-9]{2}|70[0-9]|710)\d$/,
      'fi-FI': /^\d{6}[-+A]\d{3}[0-9A-FHJ-NPR-Y]$/i,
      'fr-BE': /^\d{11}$/,
      'fr-FR': /^[0-3]\d{12}$|^[0-3]\d\s\d{2}(\s\d{3}){3}$/,
      // Conforms both to official spec and provided example
      'fr-LU': /^\d{13}$/,
      'hr-HR': /^\d{11}$/,
      'hu-HU': /^8\d{9}$/,
      'it-IT': /^[A-Z]{6}[L-NP-V0-9]{2}[A-EHLMPRST][L-NP-V0-9]{2}[A-ILMZ][L-NP-V0-9]{3}[A-Z]$/i,
      'lv-LV': /^\d{6}-{0,1}\d{5}$/,
      // Conforms both to DG TAXUD spec and original research
      'mt-MT': /^\d{3,7}[APMGLHBZ]$|^([1-8])\1\d{7}$/i,
      'nl-NL': /^\d{9}$/,
      'pl-PL': /^\d{10,11}$/,
      'pt-PT': /^\d{9}$/,
      'ro-RO': /^\d{13}$/,
      'sk-SK': /^\d{6}\/{0,1}\d{3,4}$/,
      'sl-SI': /^[1-9]\d{7}$/,
      'sv-SE': /^(\d{6}[-+]{0,1}\d{4}|(18|19|20)\d{6}[-+]{0,1}\d{4})$/
    }; // taxIdFormat locale aliases

    taxIdFormat['lb-LU'] = taxIdFormat['fr-LU'];
    taxIdFormat['lt-LT'] = taxIdFormat['et-EE'];
    taxIdFormat['nl-BE'] = taxIdFormat['fr-BE']; // Algorithmic tax id check functions for various locales

    var taxIdCheck = {
      'bg-BG': bgBgCheck,
      'cs-CZ': csCzCheck,
      'de-AT': deAtCheck,
      'de-DE': deDeCheck,
      'dk-DK': dkDkCheck,
      'el-CY': elCyCheck,
      'el-GR': elGrCheck,
      'en-IE': enIeCheck,
      'en-US': enUsCheck,
      'es-ES': esEsCheck,
      'et-EE': etEeCheck,
      'fi-FI': fiFiCheck,
      'fr-BE': frBeCheck,
      'fr-FR': frFrCheck,
      'fr-LU': frLuCheck,
      'hr-HR': hrHrCheck,
      'hu-HU': huHuCheck,
      'it-IT': itItCheck,
      'lv-LV': lvLvCheck,
      'mt-MT': mtMtCheck,
      'nl-NL': nlNlCheck,
      'pl-PL': plPlCheck,
      'pt-PT': ptPtCheck,
      'ro-RO': roRoCheck,
      'sk-SK': skSkCheck,
      'sl-SI': slSiCheck,
      'sv-SE': svSeCheck
    }; // taxIdCheck locale aliases

    taxIdCheck['lb-LU'] = taxIdCheck['fr-LU'];
    taxIdCheck['lt-LT'] = taxIdCheck['et-EE'];
    taxIdCheck['nl-BE'] = taxIdCheck['fr-BE']; // Regexes for locales where characters should be omitted before checking format

    var allsymbols = /[-\\\/!@#$%\^&\*\(\)\+\=\[\]]+/g;
    var sanitizeRegexes = {
      'de-AT': allsymbols,
      'de-DE': /[\/\\]/g,
      'fr-BE': allsymbols
    }; // sanitizeRegexes locale aliases

    sanitizeRegexes['nl-BE'] = sanitizeRegexes['fr-BE'];
    /*
     * Validator function
     * Return true if the passed string is a valid tax identification number
     * for the specified locale.
     * Throw an error exception if the locale is not supported.
     */

    function isTaxID(str) {
      var locale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'en-US';
      (0, _assertString.default)(str); // Copy TIN to avoid replacement if sanitized

      var strcopy = str.slice(0);

      if (locale in taxIdFormat) {
        if (locale in sanitizeRegexes) {
          strcopy = strcopy.replace(sanitizeRegexes[locale], '');
        }

        if (!taxIdFormat[locale].test(strcopy)) {
          return false;
        }

        if (locale in taxIdCheck) {
          return taxIdCheck[locale](strcopy);
        } // Fallthrough; not all locales have algorithmic checks


        return true;
      }

      throw new Error("Invalid locale '".concat(locale, "'"));
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isTaxID_1);

    var isMobilePhone_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isMobilePhone;
    exports.locales = void 0;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /* eslint-disable max-len */
    var phones = {
      'am-AM': /^(\+?374|0)((10|[9|7][0-9])\d{6}$|[2-4]\d{7}$)/,
      'ar-AE': /^((\+?971)|0)?5[024568]\d{7}$/,
      'ar-BH': /^(\+?973)?(3|6)\d{7}$/,
      'ar-DZ': /^(\+?213|0)(5|6|7)\d{8}$/,
      'ar-LB': /^(\+?961)?((3|81)\d{6}|7\d{7})$/,
      'ar-EG': /^((\+?20)|0)?1[0125]\d{8}$/,
      'ar-IQ': /^(\+?964|0)?7[0-9]\d{8}$/,
      'ar-JO': /^(\+?962|0)?7[789]\d{7}$/,
      'ar-KW': /^(\+?965)[569]\d{7}$/,
      'ar-LY': /^((\+?218)|0)?(9[1-6]\d{7}|[1-8]\d{7,9})$/,
      'ar-MA': /^(?:(?:\+|00)212|0)[5-7]\d{8}$/,
      'ar-SA': /^(!?(\+?966)|0)?5\d{8}$/,
      'ar-SY': /^(!?(\+?963)|0)?9\d{8}$/,
      'ar-TN': /^(\+?216)?[2459]\d{7}$/,
      'az-AZ': /^(\+994|0)(5[015]|7[07]|99)\d{7}$/,
      'bs-BA': /^((((\+|00)3876)|06))((([0-3]|[5-6])\d{6})|(4\d{7}))$/,
      'be-BY': /^(\+?375)?(24|25|29|33|44)\d{7}$/,
      'bg-BG': /^(\+?359|0)?8[789]\d{7}$/,
      'bn-BD': /^(\+?880|0)1[13456789][0-9]{8}$/,
      'ca-AD': /^(\+376)?[346]\d{5}$/,
      'cs-CZ': /^(\+?420)? ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$/,
      'da-DK': /^(\+?45)?\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/,
      'de-DE': /^(\+49)?0?[1|3]([0|5][0-45-9]\d|6([23]|0\d?)|7([0-57-9]|6\d))\d{7}$/,
      'de-AT': /^(\+43|0)\d{1,4}\d{3,12}$/,
      'de-CH': /^(\+41|0)(7[5-9])\d{1,7}$/,
      'de-LU': /^(\+352)?((6\d1)\d{6})$/,
      'el-GR': /^(\+?30|0)?(69\d{8})$/,
      'en-AU': /^(\+?61|0)4\d{8}$/,
      'en-GB': /^(\+?44|0)7\d{9}$/,
      'en-GG': /^(\+?44|0)1481\d{6}$/,
      'en-GH': /^(\+233|0)(20|50|24|54|27|57|26|56|23|28)\d{7}$/,
      'en-HK': /^(\+?852[-\s]?)?[456789]\d{3}[-\s]?\d{4}$/,
      'en-MO': /^(\+?853[-\s]?)?[6]\d{3}[-\s]?\d{4}$/,
      'en-IE': /^(\+?353|0)8[356789]\d{7}$/,
      'en-IN': /^(\+?91|0)?[6789]\d{9}$/,
      'en-KE': /^(\+?254|0)(7|1)\d{8}$/,
      'en-MT': /^(\+?356|0)?(99|79|77|21|27|22|25)[0-9]{6}$/,
      'en-MU': /^(\+?230|0)?\d{8}$/,
      'en-NG': /^(\+?234|0)?[789]\d{9}$/,
      'en-NZ': /^(\+?64|0)[28]\d{7,9}$/,
      'en-PK': /^((\+92)|(0092))-{0,1}\d{3}-{0,1}\d{7}$|^\d{11}$|^\d{4}-\d{7}$/,
      'en-PH': /^(09|\+639)\d{9}$/,
      'en-RW': /^(\+?250|0)?[7]\d{8}$/,
      'en-SG': /^(\+65)?[689]\d{7}$/,
      'en-SL': /^(?:0|94|\+94)?(7(0|1|2|5|6|7|8)( |-)?\d)\d{6}$/,
      'en-TZ': /^(\+?255|0)?[67]\d{8}$/,
      'en-UG': /^(\+?256|0)?[7]\d{8}$/,
      'en-US': /^((\+1|1)?( |-)?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})( |-)?([2-9][0-9]{2}( |-)?[0-9]{4})$/,
      'en-ZA': /^(\+?27|0)\d{9}$/,
      'en-ZM': /^(\+?26)?09[567]\d{7}$/,
      'en-ZW': /^(\+263)[0-9]{9}$/,
      'es-AR': /^\+?549(11|[2368]\d)\d{8}$/,
      'es-BO': /^(\+?591)?(6|7)\d{7}$/,
      'es-CO': /^(\+?57)?([1-8]{1}|3[0-9]{2})?[2-9]{1}\d{6}$/,
      'es-CL': /^(\+?56|0)[2-9]\d{1}\d{7}$/,
      'es-CR': /^(\+506)?[2-8]\d{7}$/,
      'es-DO': /^(\+?1)?8[024]9\d{7}$/,
      'es-HN': /^(\+?504)?[9|8]\d{7}$/,
      'es-EC': /^(\+?593|0)([2-7]|9[2-9])\d{7}$/,
      'es-ES': /^(\+?34)?[6|7]\d{8}$/,
      'es-PE': /^(\+?51)?9\d{8}$/,
      'es-MX': /^(\+?52)?(1|01)?\d{10,11}$/,
      'es-PA': /^(\+?507)\d{7,8}$/,
      'es-PY': /^(\+?595|0)9[9876]\d{7}$/,
      'es-UY': /^(\+598|0)9[1-9][\d]{6}$/,
      'et-EE': /^(\+?372)?\s?(5|8[1-4])\s?([0-9]\s?){6,7}$/,
      'fa-IR': /^(\+?98[\-\s]?|0)9[0-39]\d[\-\s]?\d{3}[\-\s]?\d{4}$/,
      'fi-FI': /^(\+?358|0)\s?(4(0|1|2|4|5|6)?|50)\s?(\d\s?){4,8}\d$/,
      'fj-FJ': /^(\+?679)?\s?\d{3}\s?\d{4}$/,
      'fo-FO': /^(\+?298)?\s?\d{2}\s?\d{2}\s?\d{2}$/,
      'fr-FR': /^(\+?33|0)[67]\d{8}$/,
      'fr-GF': /^(\+?594|0|00594)[67]\d{8}$/,
      'fr-GP': /^(\+?590|0|00590)[67]\d{8}$/,
      'fr-MQ': /^(\+?596|0|00596)[67]\d{8}$/,
      'fr-RE': /^(\+?262|0|00262)[67]\d{8}$/,
      'he-IL': /^(\+972|0)([23489]|5[012345689]|77)[1-9]\d{6}$/,
      'hu-HU': /^(\+?36)(20|30|70)\d{7}$/,
      'id-ID': /^(\+?62|0)8(1[123456789]|2[1238]|3[1238]|5[12356789]|7[78]|9[56789]|8[123456789])([\s?|\d]{5,11})$/,
      'it-IT': /^(\+?39)?\s?3\d{2} ?\d{6,7}$/,
      'it-SM': /^((\+378)|(0549)|(\+390549)|(\+3780549))?6\d{5,9}$/,
      'ja-JP': /^(\+81[ \-]?(\(0\))?|0)[6789]0[ \-]?\d{4}[ \-]?\d{4}$/,
      'ka-GE': /^(\+?995)?(5|79)\d{7}$/,
      'kk-KZ': /^(\+?7|8)?7\d{9}$/,
      'kl-GL': /^(\+?299)?\s?\d{2}\s?\d{2}\s?\d{2}$/,
      'ko-KR': /^((\+?82)[ \-]?)?0?1([0|1|6|7|8|9]{1})[ \-]?\d{3,4}[ \-]?\d{4}$/,
      'lt-LT': /^(\+370|8)\d{8}$/,
      'ms-MY': /^(\+?6?01){1}(([0145]{1}(\-|\s)?\d{7,8})|([236789]{1}(\s|\-)?\d{7}))$/,
      'nb-NO': /^(\+?47)?[49]\d{7}$/,
      'ne-NP': /^(\+?977)?9[78]\d{8}$/,
      'nl-BE': /^(\+?32|0)4?\d{8}$/,
      'nl-NL': /^(((\+|00)?31\(0\))|((\+|00)?31)|0)6{1}\d{8}$/,
      'nn-NO': /^(\+?47)?[49]\d{7}$/,
      'pl-PL': /^(\+?48)? ?[5-8]\d ?\d{3} ?\d{2} ?\d{2}$/,
      'pt-BR': /^((\+?55\ ?[1-9]{2}\ ?)|(\+?55\ ?\([1-9]{2}\)\ ?)|(0[1-9]{2}\ ?)|(\([1-9]{2}\)\ ?)|([1-9]{2}\ ?))((\d{4}\-?\d{4})|(9[2-9]{1}\d{3}\-?\d{4}))$/,
      'pt-PT': /^(\+?351)?9[1236]\d{7}$/,
      'ro-RO': /^(\+?4?0)\s?7\d{2}(\/|\s|\.|\-)?\d{3}(\s|\.|\-)?\d{3}$/,
      'ru-RU': /^(\+?7|8)?9\d{9}$/,
      'sl-SI': /^(\+386\s?|0)(\d{1}\s?\d{3}\s?\d{2}\s?\d{2}|\d{2}\s?\d{3}\s?\d{3})$/,
      'sk-SK': /^(\+?421)? ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$/,
      'sq-AL': /^(\+355|0)6[789]\d{6}$/,
      'sr-RS': /^(\+3816|06)[- \d]{5,9}$/,
      'sv-SE': /^(\+?46|0)[\s\-]?7[\s\-]?[02369]([\s\-]?\d){7}$/,
      'th-TH': /^(\+66|66|0)\d{9}$/,
      'tr-TR': /^(\+?90|0)?5\d{9}$/,
      'uk-UA': /^(\+?38|8)?0\d{9}$/,
      'uz-UZ': /^(\+?998)?(6[125-79]|7[1-69]|88|9\d)\d{7}$/,
      'vi-VN': /^(\+?84|0)((3([2-9]))|(5([2689]))|(7([0|6-9]))|(8([1-6|89]))|(9([0-9])))([0-9]{7})$/,
      'zh-CN': /^((\+|00)86)?1([3568][0-9]|4[579]|6[67]|7[01235678]|9[012356789])[0-9]{8}$/,
      'zh-TW': /^(\+?886\-?|0)?9\d{8}$/
    };
    /* eslint-enable max-len */
    // aliases

    phones['en-CA'] = phones['en-US'];
    phones['fr-CA'] = phones['en-CA'];
    phones['fr-BE'] = phones['nl-BE'];
    phones['zh-HK'] = phones['en-HK'];
    phones['zh-MO'] = phones['en-MO'];
    phones['ga-IE'] = phones['en-IE'];

    function isMobilePhone(str, locale, options) {
      (0, _assertString.default)(str);

      if (options && options.strictMode && !str.startsWith('+')) {
        return false;
      }

      if (Array.isArray(locale)) {
        return locale.some(function (key) {
          // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes
          // istanbul ignore else
          if (phones.hasOwnProperty(key)) {
            var phone = phones[key];

            if (phone.test(str)) {
              return true;
            }
          }

          return false;
        });
      } else if (locale in phones) {
        return phones[locale].test(str); // alias falsey locale as 'any'
      } else if (!locale || locale === 'any') {
        for (var key in phones) {
          // istanbul ignore else
          if (phones.hasOwnProperty(key)) {
            var phone = phones[key];

            if (phone.test(str)) {
              return true;
            }
          }
        }

        return false;
      }

      throw new Error("Invalid locale '".concat(locale, "'"));
    }

    var locales = Object.keys(phones);
    exports.locales = locales;
    });

    unwrapExports(isMobilePhone_1);
    isMobilePhone_1.locales;

    var isEthereumAddress_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isEthereumAddress;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var eth = /^(0x)[0-9a-f]{40}$/i;

    function isEthereumAddress(str) {
      (0, _assertString.default)(str);
      return eth.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isEthereumAddress_1);

    var isCurrency_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isCurrency;

    var _merge = _interopRequireDefault(merge_1);

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function currencyRegex(options) {
      var decimal_digits = "\\d{".concat(options.digits_after_decimal[0], "}");
      options.digits_after_decimal.forEach(function (digit, index) {
        if (index !== 0) decimal_digits = "".concat(decimal_digits, "|\\d{").concat(digit, "}");
      });
      var symbol = "(".concat(options.symbol.replace(/\W/, function (m) {
        return "\\".concat(m);
      }), ")").concat(options.require_symbol ? '' : '?'),
          negative = '-?',
          whole_dollar_amount_without_sep = '[1-9]\\d*',
          whole_dollar_amount_with_sep = "[1-9]\\d{0,2}(\\".concat(options.thousands_separator, "\\d{3})*"),
          valid_whole_dollar_amounts = ['0', whole_dollar_amount_without_sep, whole_dollar_amount_with_sep],
          whole_dollar_amount = "(".concat(valid_whole_dollar_amounts.join('|'), ")?"),
          decimal_amount = "(\\".concat(options.decimal_separator, "(").concat(decimal_digits, "))").concat(options.require_decimal ? '' : '?');
      var pattern = whole_dollar_amount + (options.allow_decimal || options.require_decimal ? decimal_amount : ''); // default is negative sign before symbol, but there are two other options (besides parens)

      if (options.allow_negatives && !options.parens_for_negatives) {
        if (options.negative_sign_after_digits) {
          pattern += negative;
        } else if (options.negative_sign_before_digits) {
          pattern = negative + pattern;
        }
      } // South African Rand, for example, uses R 123 (space) and R-123 (no space)


      if (options.allow_negative_sign_placeholder) {
        pattern = "( (?!\\-))?".concat(pattern);
      } else if (options.allow_space_after_symbol) {
        pattern = " ?".concat(pattern);
      } else if (options.allow_space_after_digits) {
        pattern += '( (?!$))?';
      }

      if (options.symbol_after_digits) {
        pattern += symbol;
      } else {
        pattern = symbol + pattern;
      }

      if (options.allow_negatives) {
        if (options.parens_for_negatives) {
          pattern = "(\\(".concat(pattern, "\\)|").concat(pattern, ")");
        } else if (!(options.negative_sign_before_digits || options.negative_sign_after_digits)) {
          pattern = negative + pattern;
        }
      } // ensure there's a dollar and/or decimal amount, and that
      // it doesn't start with a space or a negative sign followed by a space


      return new RegExp("^(?!-? )(?=.*\\d)".concat(pattern, "$"));
    }

    var default_currency_options = {
      symbol: '$',
      require_symbol: false,
      allow_space_after_symbol: false,
      symbol_after_digits: false,
      allow_negatives: true,
      parens_for_negatives: false,
      negative_sign_before_digits: false,
      negative_sign_after_digits: false,
      allow_negative_sign_placeholder: false,
      thousands_separator: ',',
      decimal_separator: '.',
      allow_decimal: true,
      require_decimal: false,
      digits_after_decimal: [2],
      allow_space_after_digits: false
    };

    function isCurrency(str, options) {
      (0, _assertString.default)(str);
      options = (0, _merge.default)(options, default_currency_options);
      return currencyRegex(options).test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isCurrency_1);

    var isBtcAddress_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isBtcAddress;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    // supports Bech32 addresses
    var btc = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/;

    function isBtcAddress(str) {
      (0, _assertString.default)(str);
      return btc.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isBtcAddress_1);

    var isISO8601_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isISO8601;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /* eslint-disable max-len */
    // from http://goo.gl/0ejHHW
    var iso8601 = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/; // same as above, except with a strict 'T' separator between date and time

    var iso8601StrictSeparator = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;
    /* eslint-enable max-len */

    var isValidDate = function isValidDate(str) {
      // str must have passed the ISO8601 check
      // this check is meant to catch invalid dates
      // like 2009-02-31
      // first check for ordinal dates
      var ordinalMatch = str.match(/^(\d{4})-?(\d{3})([ T]{1}\.*|$)/);

      if (ordinalMatch) {
        var oYear = Number(ordinalMatch[1]);
        var oDay = Number(ordinalMatch[2]); // if is leap year

        if (oYear % 4 === 0 && oYear % 100 !== 0 || oYear % 400 === 0) return oDay <= 366;
        return oDay <= 365;
      }

      var match = str.match(/(\d{4})-?(\d{0,2})-?(\d*)/).map(Number);
      var year = match[1];
      var month = match[2];
      var day = match[3];
      var monthString = month ? "0".concat(month).slice(-2) : month;
      var dayString = day ? "0".concat(day).slice(-2) : day; // create a date object and compare

      var d = new Date("".concat(year, "-").concat(monthString || '01', "-").concat(dayString || '01'));

      if (month && day) {
        return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
      }

      return true;
    };

    function isISO8601(str) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      (0, _assertString.default)(str);
      var check = options.strictSeparator ? iso8601StrictSeparator.test(str) : iso8601.test(str);
      if (check && options.strict) return isValidDate(str);
      return check;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isISO8601_1);

    var isRFC3339_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isRFC3339;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /* Based on https://tools.ietf.org/html/rfc3339#section-5.6 */
    var dateFullYear = /[0-9]{4}/;
    var dateMonth = /(0[1-9]|1[0-2])/;
    var dateMDay = /([12]\d|0[1-9]|3[01])/;
    var timeHour = /([01][0-9]|2[0-3])/;
    var timeMinute = /[0-5][0-9]/;
    var timeSecond = /([0-5][0-9]|60)/;
    var timeSecFrac = /(\.[0-9]+)?/;
    var timeNumOffset = new RegExp("[-+]".concat(timeHour.source, ":").concat(timeMinute.source));
    var timeOffset = new RegExp("([zZ]|".concat(timeNumOffset.source, ")"));
    var partialTime = new RegExp("".concat(timeHour.source, ":").concat(timeMinute.source, ":").concat(timeSecond.source).concat(timeSecFrac.source));
    var fullDate = new RegExp("".concat(dateFullYear.source, "-").concat(dateMonth.source, "-").concat(dateMDay.source));
    var fullTime = new RegExp("".concat(partialTime.source).concat(timeOffset.source));
    var rfc3339 = new RegExp("".concat(fullDate.source, "[ tT]").concat(fullTime.source));

    function isRFC3339(str) {
      (0, _assertString.default)(str);
      return rfc3339.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isRFC3339_1);

    var isISO31661Alpha2_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isISO31661Alpha2;

    var _assertString = _interopRequireDefault(assertString_1);

    var _includes = _interopRequireDefault(includes_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    // from https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
    var validISO31661Alpha2CountriesCodes = ['AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'];

    function isISO31661Alpha2(str) {
      (0, _assertString.default)(str);
      return (0, _includes.default)(validISO31661Alpha2CountriesCodes, str.toUpperCase());
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isISO31661Alpha2_1);

    var isISO31661Alpha3_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isISO31661Alpha3;

    var _assertString = _interopRequireDefault(assertString_1);

    var _includes = _interopRequireDefault(includes_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    // from https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3
    var validISO31661Alpha3CountriesCodes = ['AFG', 'ALA', 'ALB', 'DZA', 'ASM', 'AND', 'AGO', 'AIA', 'ATA', 'ATG', 'ARG', 'ARM', 'ABW', 'AUS', 'AUT', 'AZE', 'BHS', 'BHR', 'BGD', 'BRB', 'BLR', 'BEL', 'BLZ', 'BEN', 'BMU', 'BTN', 'BOL', 'BES', 'BIH', 'BWA', 'BVT', 'BRA', 'IOT', 'BRN', 'BGR', 'BFA', 'BDI', 'KHM', 'CMR', 'CAN', 'CPV', 'CYM', 'CAF', 'TCD', 'CHL', 'CHN', 'CXR', 'CCK', 'COL', 'COM', 'COG', 'COD', 'COK', 'CRI', 'CIV', 'HRV', 'CUB', 'CUW', 'CYP', 'CZE', 'DNK', 'DJI', 'DMA', 'DOM', 'ECU', 'EGY', 'SLV', 'GNQ', 'ERI', 'EST', 'ETH', 'FLK', 'FRO', 'FJI', 'FIN', 'FRA', 'GUF', 'PYF', 'ATF', 'GAB', 'GMB', 'GEO', 'DEU', 'GHA', 'GIB', 'GRC', 'GRL', 'GRD', 'GLP', 'GUM', 'GTM', 'GGY', 'GIN', 'GNB', 'GUY', 'HTI', 'HMD', 'VAT', 'HND', 'HKG', 'HUN', 'ISL', 'IND', 'IDN', 'IRN', 'IRQ', 'IRL', 'IMN', 'ISR', 'ITA', 'JAM', 'JPN', 'JEY', 'JOR', 'KAZ', 'KEN', 'KIR', 'PRK', 'KOR', 'KWT', 'KGZ', 'LAO', 'LVA', 'LBN', 'LSO', 'LBR', 'LBY', 'LIE', 'LTU', 'LUX', 'MAC', 'MKD', 'MDG', 'MWI', 'MYS', 'MDV', 'MLI', 'MLT', 'MHL', 'MTQ', 'MRT', 'MUS', 'MYT', 'MEX', 'FSM', 'MDA', 'MCO', 'MNG', 'MNE', 'MSR', 'MAR', 'MOZ', 'MMR', 'NAM', 'NRU', 'NPL', 'NLD', 'NCL', 'NZL', 'NIC', 'NER', 'NGA', 'NIU', 'NFK', 'MNP', 'NOR', 'OMN', 'PAK', 'PLW', 'PSE', 'PAN', 'PNG', 'PRY', 'PER', 'PHL', 'PCN', 'POL', 'PRT', 'PRI', 'QAT', 'REU', 'ROU', 'RUS', 'RWA', 'BLM', 'SHN', 'KNA', 'LCA', 'MAF', 'SPM', 'VCT', 'WSM', 'SMR', 'STP', 'SAU', 'SEN', 'SRB', 'SYC', 'SLE', 'SGP', 'SXM', 'SVK', 'SVN', 'SLB', 'SOM', 'ZAF', 'SGS', 'SSD', 'ESP', 'LKA', 'SDN', 'SUR', 'SJM', 'SWZ', 'SWE', 'CHE', 'SYR', 'TWN', 'TJK', 'TZA', 'THA', 'TLS', 'TGO', 'TKL', 'TON', 'TTO', 'TUN', 'TUR', 'TKM', 'TCA', 'TUV', 'UGA', 'UKR', 'ARE', 'GBR', 'USA', 'UMI', 'URY', 'UZB', 'VUT', 'VEN', 'VNM', 'VGB', 'VIR', 'WLF', 'ESH', 'YEM', 'ZMB', 'ZWE'];

    function isISO31661Alpha3(str) {
      (0, _assertString.default)(str);
      return (0, _includes.default)(validISO31661Alpha3CountriesCodes, str.toUpperCase());
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isISO31661Alpha3_1);

    var isBase32_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isBase32;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var base32 = /^[A-Z2-7]+=*$/;

    function isBase32(str) {
      (0, _assertString.default)(str);
      var len = str.length;

      if (len % 8 === 0 && base32.test(str)) {
        return true;
      }

      return false;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isBase32_1);

    var isBase58_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isBase58;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    // Accepted chars - 123456789ABCDEFGH JKLMN PQRSTUVWXYZabcdefghijk mnopqrstuvwxyz
    var base58Reg = /^[A-HJ-NP-Za-km-z1-9]*$/;

    function isBase58(str) {
      (0, _assertString.default)(str);

      if (base58Reg.test(str)) {
        return true;
      }

      return false;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isBase58_1);

    var isDataURI_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isDataURI;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var validMediaType = /^[a-z]+\/[a-z0-9\-\+]+$/i;
    var validAttribute = /^[a-z\-]+=[a-z0-9\-]+$/i;
    var validData = /^[a-z0-9!\$&'\(\)\*\+,;=\-\._~:@\/\?%\s]*$/i;

    function isDataURI(str) {
      (0, _assertString.default)(str);
      var data = str.split(',');

      if (data.length < 2) {
        return false;
      }

      var attributes = data.shift().trim().split(';');
      var schemeAndMediaType = attributes.shift();

      if (schemeAndMediaType.substr(0, 5) !== 'data:') {
        return false;
      }

      var mediaType = schemeAndMediaType.substr(5);

      if (mediaType !== '' && !validMediaType.test(mediaType)) {
        return false;
      }

      for (var i = 0; i < attributes.length; i++) {
        if (i === attributes.length - 1 && attributes[i].toLowerCase() === 'base64') ; else if (!validAttribute.test(attributes[i])) {
          return false;
        }
      }

      for (var _i = 0; _i < data.length; _i++) {
        if (!validData.test(data[_i])) {
          return false;
        }
      }

      return true;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isDataURI_1);

    var isMagnetURI_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isMagnetURI;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var magnetURI = /^magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32,40}&dn=.+&tr=.+$/i;

    function isMagnetURI(url) {
      (0, _assertString.default)(url);
      return magnetURI.test(url.trim());
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isMagnetURI_1);

    var isMimeType_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isMimeType;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /*
      Checks if the provided string matches to a correct Media type format (MIME type)

      This function only checks is the string format follows the
      etablished rules by the according RFC specifications.
      This function supports 'charset' in textual media types
      (https://tools.ietf.org/html/rfc6657).

      This function does not check against all the media types listed
      by the IANA (https://www.iana.org/assignments/media-types/media-types.xhtml)
      because of lightness purposes : it would require to include
      all these MIME types in this librairy, which would weigh it
      significantly. This kind of effort maybe is not worth for the use that
      this function has in this entire librairy.

      More informations in the RFC specifications :
      - https://tools.ietf.org/html/rfc2045
      - https://tools.ietf.org/html/rfc2046
      - https://tools.ietf.org/html/rfc7231#section-3.1.1.1
      - https://tools.ietf.org/html/rfc7231#section-3.1.1.5
    */
    // Match simple MIME types
    // NB :
    //   Subtype length must not exceed 100 characters.
    //   This rule does not comply to the RFC specs (what is the max length ?).
    var mimeTypeSimple = /^(application|audio|font|image|message|model|multipart|text|video)\/[a-zA-Z0-9\.\-\+]{1,100}$/i; // eslint-disable-line max-len
    // Handle "charset" in "text/*"

    var mimeTypeText = /^text\/[a-zA-Z0-9\.\-\+]{1,100};\s?charset=("[a-zA-Z0-9\.\-\+\s]{0,70}"|[a-zA-Z0-9\.\-\+]{0,70})(\s?\([a-zA-Z0-9\.\-\+\s]{1,20}\))?$/i; // eslint-disable-line max-len
    // Handle "boundary" in "multipart/*"

    var mimeTypeMultipart = /^multipart\/[a-zA-Z0-9\.\-\+]{1,100}(;\s?(boundary|charset)=("[a-zA-Z0-9\.\-\+\s]{0,70}"|[a-zA-Z0-9\.\-\+]{0,70})(\s?\([a-zA-Z0-9\.\-\+\s]{1,20}\))?){0,2}$/i; // eslint-disable-line max-len

    function isMimeType(str) {
      (0, _assertString.default)(str);
      return mimeTypeSimple.test(str) || mimeTypeText.test(str) || mimeTypeMultipart.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isMimeType_1);

    var isLatLong_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isLatLong;

    var _assertString = _interopRequireDefault(assertString_1);

    var _merge = _interopRequireDefault(merge_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var lat = /^\(?[+-]?(90(\.0+)?|[1-8]?\d(\.\d+)?)$/;
    var long = /^\s?[+-]?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)\)?$/;
    var latDMS = /^(([1-8]?\d)\D+([1-5]?\d|60)\D+([1-5]?\d|60)(\.\d+)?|90\D+0\D+0)\D+[NSns]?$/i;
    var longDMS = /^\s*([1-7]?\d{1,2}\D+([1-5]?\d|60)\D+([1-5]?\d|60)(\.\d+)?|180\D+0\D+0)\D+[EWew]?$/i;
    var defaultLatLongOptions = {
      checkDMS: false
    };

    function isLatLong(str, options) {
      (0, _assertString.default)(str);
      options = (0, _merge.default)(options, defaultLatLongOptions);
      if (!str.includes(',')) return false;
      var pair = str.split(',');
      if (pair[0].startsWith('(') && !pair[1].endsWith(')') || pair[1].endsWith(')') && !pair[0].startsWith('(')) return false;

      if (options.checkDMS) {
        return latDMS.test(pair[0]) && longDMS.test(pair[1]);
      }

      return lat.test(pair[0]) && long.test(pair[1]);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isLatLong_1);

    var isPostalCode_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isPostalCode;
    exports.locales = void 0;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    // common patterns
    var threeDigit = /^\d{3}$/;
    var fourDigit = /^\d{4}$/;
    var fiveDigit = /^\d{5}$/;
    var sixDigit = /^\d{6}$/;
    var patterns = {
      AD: /^AD\d{3}$/,
      AT: fourDigit,
      AU: fourDigit,
      AZ: /^AZ\d{4}$/,
      BE: fourDigit,
      BG: fourDigit,
      BR: /^\d{5}-\d{3}$/,
      BY: /2[1-4]{1}\d{4}$/,
      CA: /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][\s\-]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
      CH: fourDigit,
      CN: /^(0[1-7]|1[012356]|2[0-7]|3[0-6]|4[0-7]|5[1-7]|6[1-7]|7[1-5]|8[1345]|9[09])\d{4}$/,
      CZ: /^\d{3}\s?\d{2}$/,
      DE: fiveDigit,
      DK: fourDigit,
      DO: fiveDigit,
      DZ: fiveDigit,
      EE: fiveDigit,
      ES: /^(5[0-2]{1}|[0-4]{1}\d{1})\d{3}$/,
      FI: fiveDigit,
      FR: /^\d{2}\s?\d{3}$/,
      GB: /^(gir\s?0aa|[a-z]{1,2}\d[\da-z]?\s?(\d[a-z]{2})?)$/i,
      GR: /^\d{3}\s?\d{2}$/,
      HR: /^([1-5]\d{4}$)/,
      HT: /^HT\d{4}$/,
      HU: fourDigit,
      ID: fiveDigit,
      IE: /^(?!.*(?:o))[A-z]\d[\dw]\s\w{4}$/i,
      IL: /^(\d{5}|\d{7})$/,
      IN: /^((?!10|29|35|54|55|65|66|86|87|88|89)[1-9][0-9]{5})$/,
      IR: /\b(?!(\d)\1{3})[13-9]{4}[1346-9][013-9]{5}\b/,
      IS: threeDigit,
      IT: fiveDigit,
      JP: /^\d{3}\-\d{4}$/,
      KE: fiveDigit,
      LI: /^(948[5-9]|949[0-7])$/,
      LT: /^LT\-\d{5}$/,
      LU: fourDigit,
      LV: /^LV\-\d{4}$/,
      MX: fiveDigit,
      MT: /^[A-Za-z]{3}\s{0,1}\d{4}$/,
      MY: fiveDigit,
      NL: /^\d{4}\s?[a-z]{2}$/i,
      NO: fourDigit,
      NP: /^(10|21|22|32|33|34|44|45|56|57)\d{3}$|^(977)$/i,
      NZ: fourDigit,
      PL: /^\d{2}\-\d{3}$/,
      PR: /^00[679]\d{2}([ -]\d{4})?$/,
      PT: /^\d{4}\-\d{3}?$/,
      RO: sixDigit,
      RU: sixDigit,
      SA: fiveDigit,
      SE: /^[1-9]\d{2}\s?\d{2}$/,
      SG: sixDigit,
      SI: fourDigit,
      SK: /^\d{3}\s?\d{2}$/,
      TH: fiveDigit,
      TN: fourDigit,
      TW: /^\d{3}(\d{2})?$/,
      UA: fiveDigit,
      US: /^\d{5}(-\d{4})?$/,
      ZA: fourDigit,
      ZM: fiveDigit
    };
    var locales = Object.keys(patterns);
    exports.locales = locales;

    function isPostalCode(str, locale) {
      (0, _assertString.default)(str);

      if (locale in patterns) {
        return patterns[locale].test(str);
      } else if (locale === 'any') {
        for (var key in patterns) {
          // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes
          // istanbul ignore else
          if (patterns.hasOwnProperty(key)) {
            var pattern = patterns[key];

            if (pattern.test(str)) {
              return true;
            }
          }
        }

        return false;
      }

      throw new Error("Invalid locale '".concat(locale, "'"));
    }
    });

    unwrapExports(isPostalCode_1);
    isPostalCode_1.locales;

    var ltrim_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = ltrim;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function ltrim(str, chars) {
      (0, _assertString.default)(str); // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping

      var pattern = chars ? new RegExp("^[".concat(chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "]+"), 'g') : /^\s+/g;
      return str.replace(pattern, '');
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(ltrim_1);

    var rtrim_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = rtrim;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function rtrim(str, chars) {
      (0, _assertString.default)(str); // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping

      var pattern = chars ? new RegExp("[".concat(chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "]+$"), 'g') : /\s+$/g;
      return str.replace(pattern, '');
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(rtrim_1);

    var trim_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = trim;

    var _rtrim = _interopRequireDefault(rtrim_1);

    var _ltrim = _interopRequireDefault(ltrim_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function trim(str, chars) {
      return (0, _rtrim.default)((0, _ltrim.default)(str, chars), chars);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(trim_1);

    var _escape = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = escape;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function escape(str) {
      (0, _assertString.default)(str);
      return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\//g, '&#x2F;').replace(/\\/g, '&#x5C;').replace(/`/g, '&#96;');
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(_escape);

    var _unescape = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = unescape;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function unescape(str) {
      (0, _assertString.default)(str);
      return str.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x2F;/g, '/').replace(/&#x5C;/g, '\\').replace(/&#96;/g, '`');
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(_unescape);

    var blacklist_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = blacklist;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function blacklist(str, chars) {
      (0, _assertString.default)(str);
      return str.replace(new RegExp("[".concat(chars, "]+"), 'g'), '');
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(blacklist_1);

    var stripLow_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = stripLow;

    var _assertString = _interopRequireDefault(assertString_1);

    var _blacklist = _interopRequireDefault(blacklist_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function stripLow(str, keep_new_lines) {
      (0, _assertString.default)(str);
      var chars = keep_new_lines ? '\\x00-\\x09\\x0B\\x0C\\x0E-\\x1F\\x7F' : '\\x00-\\x1F\\x7F';
      return (0, _blacklist.default)(str, chars);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(stripLow_1);

    var whitelist_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = whitelist;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function whitelist(str, chars) {
      (0, _assertString.default)(str);
      return str.replace(new RegExp("[^".concat(chars, "]+"), 'g'), '');
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(whitelist_1);

    var isWhitelisted_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isWhitelisted;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function isWhitelisted(str, chars) {
      (0, _assertString.default)(str);

      for (var i = str.length - 1; i >= 0; i--) {
        if (chars.indexOf(str[i]) === -1) {
          return false;
        }
      }

      return true;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isWhitelisted_1);

    var normalizeEmail_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = normalizeEmail;

    var _merge = _interopRequireDefault(merge_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var default_normalize_email_options = {
      // The following options apply to all email addresses
      // Lowercases the local part of the email address.
      // Please note this may violate RFC 5321 as per http://stackoverflow.com/a/9808332/192024).
      // The domain is always lowercased, as per RFC 1035
      all_lowercase: true,
      // The following conversions are specific to GMail
      // Lowercases the local part of the GMail address (known to be case-insensitive)
      gmail_lowercase: true,
      // Removes dots from the local part of the email address, as that's ignored by GMail
      gmail_remove_dots: true,
      // Removes the subaddress (e.g. "+foo") from the email address
      gmail_remove_subaddress: true,
      // Conversts the googlemail.com domain to gmail.com
      gmail_convert_googlemaildotcom: true,
      // The following conversions are specific to Outlook.com / Windows Live / Hotmail
      // Lowercases the local part of the Outlook.com address (known to be case-insensitive)
      outlookdotcom_lowercase: true,
      // Removes the subaddress (e.g. "+foo") from the email address
      outlookdotcom_remove_subaddress: true,
      // The following conversions are specific to Yahoo
      // Lowercases the local part of the Yahoo address (known to be case-insensitive)
      yahoo_lowercase: true,
      // Removes the subaddress (e.g. "-foo") from the email address
      yahoo_remove_subaddress: true,
      // The following conversions are specific to Yandex
      // Lowercases the local part of the Yandex address (known to be case-insensitive)
      yandex_lowercase: true,
      // The following conversions are specific to iCloud
      // Lowercases the local part of the iCloud address (known to be case-insensitive)
      icloud_lowercase: true,
      // Removes the subaddress (e.g. "+foo") from the email address
      icloud_remove_subaddress: true
    }; // List of domains used by iCloud

    var icloud_domains = ['icloud.com', 'me.com']; // List of domains used by Outlook.com and its predecessors
    // This list is likely incomplete.
    // Partial reference:
    // https://blogs.office.com/2013/04/17/outlook-com-gets-two-step-verification-sign-in-by-alias-and-new-international-domains/

    var outlookdotcom_domains = ['hotmail.at', 'hotmail.be', 'hotmail.ca', 'hotmail.cl', 'hotmail.co.il', 'hotmail.co.nz', 'hotmail.co.th', 'hotmail.co.uk', 'hotmail.com', 'hotmail.com.ar', 'hotmail.com.au', 'hotmail.com.br', 'hotmail.com.gr', 'hotmail.com.mx', 'hotmail.com.pe', 'hotmail.com.tr', 'hotmail.com.vn', 'hotmail.cz', 'hotmail.de', 'hotmail.dk', 'hotmail.es', 'hotmail.fr', 'hotmail.hu', 'hotmail.id', 'hotmail.ie', 'hotmail.in', 'hotmail.it', 'hotmail.jp', 'hotmail.kr', 'hotmail.lv', 'hotmail.my', 'hotmail.ph', 'hotmail.pt', 'hotmail.sa', 'hotmail.sg', 'hotmail.sk', 'live.be', 'live.co.uk', 'live.com', 'live.com.ar', 'live.com.mx', 'live.de', 'live.es', 'live.eu', 'live.fr', 'live.it', 'live.nl', 'msn.com', 'outlook.at', 'outlook.be', 'outlook.cl', 'outlook.co.il', 'outlook.co.nz', 'outlook.co.th', 'outlook.com', 'outlook.com.ar', 'outlook.com.au', 'outlook.com.br', 'outlook.com.gr', 'outlook.com.pe', 'outlook.com.tr', 'outlook.com.vn', 'outlook.cz', 'outlook.de', 'outlook.dk', 'outlook.es', 'outlook.fr', 'outlook.hu', 'outlook.id', 'outlook.ie', 'outlook.in', 'outlook.it', 'outlook.jp', 'outlook.kr', 'outlook.lv', 'outlook.my', 'outlook.ph', 'outlook.pt', 'outlook.sa', 'outlook.sg', 'outlook.sk', 'passport.com']; // List of domains used by Yahoo Mail
    // This list is likely incomplete

    var yahoo_domains = ['rocketmail.com', 'yahoo.ca', 'yahoo.co.uk', 'yahoo.com', 'yahoo.de', 'yahoo.fr', 'yahoo.in', 'yahoo.it', 'ymail.com']; // List of domains used by yandex.ru

    var yandex_domains = ['yandex.ru', 'yandex.ua', 'yandex.kz', 'yandex.com', 'yandex.by', 'ya.ru']; // replace single dots, but not multiple consecutive dots

    function dotsReplacer(match) {
      if (match.length > 1) {
        return match;
      }

      return '';
    }

    function normalizeEmail(email, options) {
      options = (0, _merge.default)(options, default_normalize_email_options);
      var raw_parts = email.split('@');
      var domain = raw_parts.pop();
      var user = raw_parts.join('@');
      var parts = [user, domain]; // The domain is always lowercased, as it's case-insensitive per RFC 1035

      parts[1] = parts[1].toLowerCase();

      if (parts[1] === 'gmail.com' || parts[1] === 'googlemail.com') {
        // Address is GMail
        if (options.gmail_remove_subaddress) {
          parts[0] = parts[0].split('+')[0];
        }

        if (options.gmail_remove_dots) {
          // this does not replace consecutive dots like example..email@gmail.com
          parts[0] = parts[0].replace(/\.+/g, dotsReplacer);
        }

        if (!parts[0].length) {
          return false;
        }

        if (options.all_lowercase || options.gmail_lowercase) {
          parts[0] = parts[0].toLowerCase();
        }

        parts[1] = options.gmail_convert_googlemaildotcom ? 'gmail.com' : parts[1];
      } else if (icloud_domains.indexOf(parts[1]) >= 0) {
        // Address is iCloud
        if (options.icloud_remove_subaddress) {
          parts[0] = parts[0].split('+')[0];
        }

        if (!parts[0].length) {
          return false;
        }

        if (options.all_lowercase || options.icloud_lowercase) {
          parts[0] = parts[0].toLowerCase();
        }
      } else if (outlookdotcom_domains.indexOf(parts[1]) >= 0) {
        // Address is Outlook.com
        if (options.outlookdotcom_remove_subaddress) {
          parts[0] = parts[0].split('+')[0];
        }

        if (!parts[0].length) {
          return false;
        }

        if (options.all_lowercase || options.outlookdotcom_lowercase) {
          parts[0] = parts[0].toLowerCase();
        }
      } else if (yahoo_domains.indexOf(parts[1]) >= 0) {
        // Address is Yahoo
        if (options.yahoo_remove_subaddress) {
          var components = parts[0].split('-');
          parts[0] = components.length > 1 ? components.slice(0, -1).join('-') : components[0];
        }

        if (!parts[0].length) {
          return false;
        }

        if (options.all_lowercase || options.yahoo_lowercase) {
          parts[0] = parts[0].toLowerCase();
        }
      } else if (yandex_domains.indexOf(parts[1]) >= 0) {
        if (options.all_lowercase || options.yandex_lowercase) {
          parts[0] = parts[0].toLowerCase();
        }

        parts[1] = 'yandex.ru'; // all yandex domains are equal, 1st preferred
      } else if (options.all_lowercase) {
        // Any other address
        parts[0] = parts[0].toLowerCase();
      }

      return parts.join('@');
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(normalizeEmail_1);

    var isSlug_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isSlug;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var charsetRegex = /^[^\s-_](?!.*?[-_]{2,})([a-z0-9-\\]{1,})[^\s]*[^-_\s]$/;

    function isSlug(str) {
      (0, _assertString.default)(str);
      return charsetRegex.test(str);
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isSlug_1);

    var isStrongPassword_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isStrongPassword;

    var _merge = _interopRequireDefault(merge_1);

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var upperCaseRegex = /^[A-Z]$/;
    var lowerCaseRegex = /^[a-z]$/;
    var numberRegex = /^[0-9]$/;
    var symbolRegex = /^[-#!$%^&*()_+|~=`{}\[\]:";'<>?,.\/ ]$/;
    var defaultOptions = {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
      returnScore: false,
      pointsPerUnique: 1,
      pointsPerRepeat: 0.5,
      pointsForContainingLower: 10,
      pointsForContainingUpper: 10,
      pointsForContainingNumber: 10,
      pointsForContainingSymbol: 10
    };
    /* Counts number of occurrences of each char in a string
     * could be moved to util/ ?
    */

    function countChars(str) {
      var result = {};
      Array.from(str).forEach(function (char) {
        var curVal = result[char];

        if (curVal) {
          result[char] += 1;
        } else {
          result[char] = 1;
        }
      });
      return result;
    }
    /* Return information about a password */


    function analyzePassword(password) {
      var charMap = countChars(password);
      var analysis = {
        length: password.length,
        uniqueChars: Object.keys(charMap).length,
        uppercaseCount: 0,
        lowercaseCount: 0,
        numberCount: 0,
        symbolCount: 0
      };
      Object.keys(charMap).forEach(function (char) {
        if (upperCaseRegex.test(char)) {
          analysis.uppercaseCount += charMap[char];
        } else if (lowerCaseRegex.test(char)) {
          analysis.lowercaseCount += charMap[char];
        } else if (numberRegex.test(char)) {
          analysis.numberCount += charMap[char];
        } else if (symbolRegex.test(char)) {
          analysis.symbolCount += charMap[char];
        }
      });
      return analysis;
    }

    function scorePassword(analysis, scoringOptions) {
      var points = 0;
      points += analysis.uniqueChars * scoringOptions.pointsPerUnique;
      points += (analysis.length - analysis.uniqueChars) * scoringOptions.pointsPerRepeat;

      if (analysis.lowercaseCount > 0) {
        points += scoringOptions.pointsForContainingLower;
      }

      if (analysis.uppercaseCount > 0) {
        points += scoringOptions.pointsForContainingUpper;
      }

      if (analysis.numberCount > 0) {
        points += scoringOptions.pointsForContainingNumber;
      }

      if (analysis.symbolCount > 0) {
        points += scoringOptions.pointsForContainingSymbol;
      }

      return points;
    }

    function isStrongPassword(str) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      (0, _assertString.default)(str);
      var analysis = analyzePassword(str);
      options = (0, _merge.default)(options || {}, defaultOptions);

      if (options.returnScore) {
        return scorePassword(analysis, options);
      }

      return analysis.length >= options.minLength && analysis.lowercaseCount >= options.minLowercase && analysis.uppercaseCount >= options.minUppercase && analysis.numberCount >= options.minNumbers && analysis.symbolCount >= options.minSymbols;
    }

    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    unwrapExports(isStrongPassword_1);

    var isVAT_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isVAT;
    exports.vatMatchers = void 0;

    var _assertString = _interopRequireDefault(assertString_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var vatMatchers = {
      GB: /^GB((\d{3} \d{4} ([0-8][0-9]|9[0-6]))|(\d{9} \d{3})|(((GD[0-4])|(HA[5-9]))[0-9]{2}))$/
    };
    exports.vatMatchers = vatMatchers;

    function isVAT(str, countryCode) {
      (0, _assertString.default)(str);
      (0, _assertString.default)(countryCode);

      if (countryCode in vatMatchers) {
        return vatMatchers[countryCode].test(str);
      }

      throw new Error("Invalid country code: '".concat(countryCode, "'"));
    }
    });

    unwrapExports(isVAT_1);
    isVAT_1.vatMatchers;

    var validator_1 = createCommonjsModule(function (module, exports) {

    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;

    var _toDate = _interopRequireDefault(toDate_1);

    var _toFloat = _interopRequireDefault(toFloat_1);

    var _toInt = _interopRequireDefault(toInt_1);

    var _toBoolean = _interopRequireDefault(toBoolean_1);

    var _equals = _interopRequireDefault(equals_1);

    var _contains = _interopRequireDefault(contains_1);

    var _matches = _interopRequireDefault(matches_1);

    var _isEmail = _interopRequireDefault(isEmail_1);

    var _isURL = _interopRequireDefault(isURL_1);

    var _isMACAddress = _interopRequireDefault(isMACAddress_1);

    var _isIP = _interopRequireDefault(isIP_1);

    var _isIPRange = _interopRequireDefault(isIPRange_1);

    var _isFQDN = _interopRequireDefault(isFQDN_1);

    var _isDate = _interopRequireDefault(isDate_1);

    var _isBoolean = _interopRequireDefault(isBoolean_1);

    var _isLocale = _interopRequireDefault(isLocale_1);

    var _isAlpha = _interopRequireWildcard(isAlpha_1);

    var _isAlphanumeric = _interopRequireWildcard(isAlphanumeric_1);

    var _isNumeric = _interopRequireDefault(isNumeric_1);

    var _isPassportNumber = _interopRequireDefault(isPassportNumber_1);

    var _isPort = _interopRequireDefault(isPort_1);

    var _isLowercase = _interopRequireDefault(isLowercase_1);

    var _isUppercase = _interopRequireDefault(isUppercase_1);

    var _isIMEI = _interopRequireDefault(isIMEI_1);

    var _isAscii = _interopRequireDefault(isAscii_1);

    var _isFullWidth = _interopRequireDefault(isFullWidth_1);

    var _isHalfWidth = _interopRequireDefault(isHalfWidth_1);

    var _isVariableWidth = _interopRequireDefault(isVariableWidth_1);

    var _isMultibyte = _interopRequireDefault(isMultibyte_1);

    var _isSemVer = _interopRequireDefault(isSemVer_1);

    var _isSurrogatePair = _interopRequireDefault(isSurrogatePair_1);

    var _isInt = _interopRequireDefault(isInt_1);

    var _isFloat = _interopRequireWildcard(isFloat_1);

    var _isDecimal = _interopRequireDefault(isDecimal_1);

    var _isHexadecimal = _interopRequireDefault(isHexadecimal_1);

    var _isOctal = _interopRequireDefault(isOctal_1);

    var _isDivisibleBy = _interopRequireDefault(isDivisibleBy_1);

    var _isHexColor = _interopRequireDefault(isHexColor_1);

    var _isRgbColor = _interopRequireDefault(isRgbColor_1);

    var _isHSL = _interopRequireDefault(isHSL_1);

    var _isISRC = _interopRequireDefault(isISRC_1);

    var _isIBAN = _interopRequireDefault(isIBAN_1);

    var _isBIC = _interopRequireDefault(isBIC_1);

    var _isMD = _interopRequireDefault(isMD5_1);

    var _isHash = _interopRequireDefault(isHash_1);

    var _isJWT = _interopRequireDefault(isJWT_1);

    var _isJSON = _interopRequireDefault(isJSON_1);

    var _isEmpty = _interopRequireDefault(isEmpty_1);

    var _isLength = _interopRequireDefault(isLength_1);

    var _isByteLength = _interopRequireDefault(isByteLength_1);

    var _isUUID = _interopRequireDefault(isUUID_1);

    var _isMongoId = _interopRequireDefault(isMongoId_1);

    var _isAfter = _interopRequireDefault(isAfter_1);

    var _isBefore = _interopRequireDefault(isBefore_1);

    var _isIn = _interopRequireDefault(isIn_1);

    var _isCreditCard = _interopRequireDefault(isCreditCard_1);

    var _isIdentityCard = _interopRequireDefault(isIdentityCard_1);

    var _isEAN = _interopRequireDefault(isEAN_1);

    var _isISIN = _interopRequireDefault(isISIN_1);

    var _isISBN = _interopRequireDefault(isISBN_1);

    var _isISSN = _interopRequireDefault(isISSN_1);

    var _isTaxID = _interopRequireDefault(isTaxID_1);

    var _isMobilePhone = _interopRequireWildcard(isMobilePhone_1);

    var _isEthereumAddress = _interopRequireDefault(isEthereumAddress_1);

    var _isCurrency = _interopRequireDefault(isCurrency_1);

    var _isBtcAddress = _interopRequireDefault(isBtcAddress_1);

    var _isISO = _interopRequireDefault(isISO8601_1);

    var _isRFC = _interopRequireDefault(isRFC3339_1);

    var _isISO31661Alpha = _interopRequireDefault(isISO31661Alpha2_1);

    var _isISO31661Alpha2 = _interopRequireDefault(isISO31661Alpha3_1);

    var _isBase = _interopRequireDefault(isBase32_1);

    var _isBase2 = _interopRequireDefault(isBase58_1);

    var _isBase3 = _interopRequireDefault(isBase64_1);

    var _isDataURI = _interopRequireDefault(isDataURI_1);

    var _isMagnetURI = _interopRequireDefault(isMagnetURI_1);

    var _isMimeType = _interopRequireDefault(isMimeType_1);

    var _isLatLong = _interopRequireDefault(isLatLong_1);

    var _isPostalCode = _interopRequireWildcard(isPostalCode_1);

    var _ltrim = _interopRequireDefault(ltrim_1);

    var _rtrim = _interopRequireDefault(rtrim_1);

    var _trim = _interopRequireDefault(trim_1);

    var _escape$1 = _interopRequireDefault(_escape);

    var _unescape$1 = _interopRequireDefault(_unescape);

    var _stripLow = _interopRequireDefault(stripLow_1);

    var _whitelist = _interopRequireDefault(whitelist_1);

    var _blacklist = _interopRequireDefault(blacklist_1);

    var _isWhitelisted = _interopRequireDefault(isWhitelisted_1);

    var _normalizeEmail = _interopRequireDefault(normalizeEmail_1);

    var _isSlug = _interopRequireDefault(isSlug_1);

    var _isStrongPassword = _interopRequireDefault(isStrongPassword_1);

    var _isVAT = _interopRequireDefault(isVAT_1);

    function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var version = '13.5.2';
    var validator = {
      version: version,
      toDate: _toDate.default,
      toFloat: _toFloat.default,
      toInt: _toInt.default,
      toBoolean: _toBoolean.default,
      equals: _equals.default,
      contains: _contains.default,
      matches: _matches.default,
      isEmail: _isEmail.default,
      isURL: _isURL.default,
      isMACAddress: _isMACAddress.default,
      isIP: _isIP.default,
      isIPRange: _isIPRange.default,
      isFQDN: _isFQDN.default,
      isBoolean: _isBoolean.default,
      isIBAN: _isIBAN.default,
      isBIC: _isBIC.default,
      isAlpha: _isAlpha.default,
      isAlphaLocales: _isAlpha.locales,
      isAlphanumeric: _isAlphanumeric.default,
      isAlphanumericLocales: _isAlphanumeric.locales,
      isNumeric: _isNumeric.default,
      isPassportNumber: _isPassportNumber.default,
      isPort: _isPort.default,
      isLowercase: _isLowercase.default,
      isUppercase: _isUppercase.default,
      isAscii: _isAscii.default,
      isFullWidth: _isFullWidth.default,
      isHalfWidth: _isHalfWidth.default,
      isVariableWidth: _isVariableWidth.default,
      isMultibyte: _isMultibyte.default,
      isSemVer: _isSemVer.default,
      isSurrogatePair: _isSurrogatePair.default,
      isInt: _isInt.default,
      isIMEI: _isIMEI.default,
      isFloat: _isFloat.default,
      isFloatLocales: _isFloat.locales,
      isDecimal: _isDecimal.default,
      isHexadecimal: _isHexadecimal.default,
      isOctal: _isOctal.default,
      isDivisibleBy: _isDivisibleBy.default,
      isHexColor: _isHexColor.default,
      isRgbColor: _isRgbColor.default,
      isHSL: _isHSL.default,
      isISRC: _isISRC.default,
      isMD5: _isMD.default,
      isHash: _isHash.default,
      isJWT: _isJWT.default,
      isJSON: _isJSON.default,
      isEmpty: _isEmpty.default,
      isLength: _isLength.default,
      isLocale: _isLocale.default,
      isByteLength: _isByteLength.default,
      isUUID: _isUUID.default,
      isMongoId: _isMongoId.default,
      isAfter: _isAfter.default,
      isBefore: _isBefore.default,
      isIn: _isIn.default,
      isCreditCard: _isCreditCard.default,
      isIdentityCard: _isIdentityCard.default,
      isEAN: _isEAN.default,
      isISIN: _isISIN.default,
      isISBN: _isISBN.default,
      isISSN: _isISSN.default,
      isMobilePhone: _isMobilePhone.default,
      isMobilePhoneLocales: _isMobilePhone.locales,
      isPostalCode: _isPostalCode.default,
      isPostalCodeLocales: _isPostalCode.locales,
      isEthereumAddress: _isEthereumAddress.default,
      isCurrency: _isCurrency.default,
      isBtcAddress: _isBtcAddress.default,
      isISO8601: _isISO.default,
      isRFC3339: _isRFC.default,
      isISO31661Alpha2: _isISO31661Alpha.default,
      isISO31661Alpha3: _isISO31661Alpha2.default,
      isBase32: _isBase.default,
      isBase58: _isBase2.default,
      isBase64: _isBase3.default,
      isDataURI: _isDataURI.default,
      isMagnetURI: _isMagnetURI.default,
      isMimeType: _isMimeType.default,
      isLatLong: _isLatLong.default,
      ltrim: _ltrim.default,
      rtrim: _rtrim.default,
      trim: _trim.default,
      escape: _escape$1.default,
      unescape: _unescape$1.default,
      stripLow: _stripLow.default,
      whitelist: _whitelist.default,
      blacklist: _blacklist.default,
      isWhitelisted: _isWhitelisted.default,
      normalizeEmail: _normalizeEmail.default,
      toString: toString,
      isSlug: _isSlug.default,
      isStrongPassword: _isStrongPassword.default,
      isTaxID: _isTaxID.default,
      isDate: _isDate.default,
      isVAT: _isVAT.default
    };
    var _default = validator;
    exports.default = _default;
    module.exports = exports.default;
    module.exports.default = exports.default;
    });

    var validator = unwrapExports(validator_1);

    class Form{
    	static validator = validator;

    	static addComponent(name, value){
    		COMPONENTS.add(name, value);
    	}

    	static addVariants(name, value){
    		VARIANTS.add(name, value);
    	}

    	static addField(name, field){
    		FIELDS.add(name, field);
    	}

    	static actionFieldsInit(fieldName, options, validators, data){
    		if(Array.isArray(fieldName)){
    			fieldName.forEach( subFieldName => {
    				this.actionFieldsInit(subFieldName, options, validators, data);
    			});
    		}else {
    			if(!Object.prototype.hasOwnProperty.call(options, 'fields')){          options.fields = {};            }
    			if(!Object.prototype.hasOwnProperty.call(options.fields, fieldName)){ options.fields[fieldName] = {}; }
    			//copying validators
    			if(validators && validators.fields && Object.prototype.hasOwnProperty.call(validators.fields, fieldName)){
    				options.fields[fieldName].validate = validators.fields[fieldName];
    			}
    			//copying initial data
    			if(typeof data !== 'undefined' && data!== null
    				&&	typeof data[fieldName] !== 'undefined'
    				&& data[fieldName]!== null
    			){
    				options.fields[fieldName].value = data[fieldName];
    			}
    		}
    	}

    	static build({target, manifest, action, options = {}, validators = {}, data = null}){
    		return new Form$1({
    			target,
    			props: this.prebuild({manifest, action, options, validators, data})
    		});
    	}

    	static prebuild({manifest, action, options = {}, validators = {}, data = null}){
    		if(Object.prototype.hasOwnProperty.call(manifest, 'fields')){
    			FIELDS.import(manifest.fields);
    		}
    		if(typeof options === 'undefined' || options === null){
    			options = {};
    		}

    		if (manifest.actions[action] && manifest.actions[action].fields){
    			this.actionFieldsInit(manifest.actions[action].fields, options, validators, data);
    		}

    		if(typeof validators !== 'undefined' && validators !== null){
    			if(Object.prototype.hasOwnProperty.call(validators, 'forms')){
    				if(Object.prototype.hasOwnProperty.call(validators.forms, action)){
    					options.validate = validators.forms[action];
    				}
    			}
    		}

    		return {
    				title:        manifest.actions[action].title,
    				description:  manifest.actions[action].description,
    				fields:       manifest.actions[action].fields,
    				options
    			};
    	}

    	static getVariantTitle(name, id){
    		let lib = VARIANTS.get(name);
    		let result = lib.filter(item => item.id === id );
    		return result.length === 1 ? result[0]: 'noname';
    	}

    }

    /* node_modules/not-bulma/src/layout/ui.container.svelte generated by Svelte v3.35.0 */

    function create_fragment$4(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "id", /*id*/ ctx[0]);
    			attr(div, "class", div_class_value = "container " + /*classes*/ ctx[1]);
    			toggle_class(div, "is-widescreen", /*widescreen*/ ctx[2]);
    			toggle_class(div, "is-fullhd", /*fullhd*/ ctx[3]);
    			toggle_class(div, "is-max-desktop", /*maxDesktop*/ ctx[4]);
    			toggle_class(div, "is-max-widescreen", /*maxWidescreen*/ ctx[5]);
    			toggle_class(div, "is-fluid", /*fluid*/ ctx[6]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 128) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[7], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*id*/ 1) {
    				attr(div, "id", /*id*/ ctx[0]);
    			}

    			if (!current || dirty & /*classes*/ 2 && div_class_value !== (div_class_value = "container " + /*classes*/ ctx[1])) {
    				attr(div, "class", div_class_value);
    			}

    			if (dirty & /*classes, widescreen*/ 6) {
    				toggle_class(div, "is-widescreen", /*widescreen*/ ctx[2]);
    			}

    			if (dirty & /*classes, fullhd*/ 10) {
    				toggle_class(div, "is-fullhd", /*fullhd*/ ctx[3]);
    			}

    			if (dirty & /*classes, maxDesktop*/ 18) {
    				toggle_class(div, "is-max-desktop", /*maxDesktop*/ ctx[4]);
    			}

    			if (dirty & /*classes, maxWidescreen*/ 34) {
    				toggle_class(div, "is-max-widescreen", /*maxWidescreen*/ ctx[5]);
    			}

    			if (dirty & /*classes, fluid*/ 66) {
    				toggle_class(div, "is-fluid", /*fluid*/ ctx[6]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { id = "" } = $$props;
    	let { classes = "" } = $$props;
    	let { widescreen = false } = $$props;
    	let { fullhd = false } = $$props;
    	let { maxDesktop = false } = $$props;
    	let { maxWidescreen = false } = $$props;
    	let { fluid = false } = $$props;

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("classes" in $$props) $$invalidate(1, classes = $$props.classes);
    		if ("widescreen" in $$props) $$invalidate(2, widescreen = $$props.widescreen);
    		if ("fullhd" in $$props) $$invalidate(3, fullhd = $$props.fullhd);
    		if ("maxDesktop" in $$props) $$invalidate(4, maxDesktop = $$props.maxDesktop);
    		if ("maxWidescreen" in $$props) $$invalidate(5, maxWidescreen = $$props.maxWidescreen);
    		if ("fluid" in $$props) $$invalidate(6, fluid = $$props.fluid);
    		if ("$$scope" in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    	};

    	return [
    		id,
    		classes,
    		widescreen,
    		fullhd,
    		maxDesktop,
    		maxWidescreen,
    		fluid,
    		$$scope,
    		slots
    	];
    }

    class Ui_container extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			id: 0,
    			classes: 1,
    			widescreen: 2,
    			fullhd: 3,
    			maxDesktop: 4,
    			maxWidescreen: 5,
    			fluid: 6
    		});
    	}
    }

    const Validators = {
      fields: {
        term(value) {
          let errors = [];
          if(value!==''){
            if (!Form.validator.isLength(value, {
                min: 3
              })) {
              errors.push('Минимальная длина 3 знаков');
            }
          }
          return errors;
        }
      },
      forms:{
        search(form) {
          let errors = {
            clean: true,
            fields: {},
            form: []
          };
          return errors;
        }
      }
    };

    /* node_modules/not-bulma/src/various/filter.svelte generated by Svelte v3.35.0 */

    function create_else_block(ctx) {
    	let uibutton;
    	let current;

    	uibutton = new Ui_button({
    			props: {
    				title: "Поиск",
    				icon: "search",
    				size: "large",
    				classes: " is-fullwidth ",
    				action: /*toggleForm*/ ctx[3]
    			}
    		});

    	return {
    		c() {
    			create_component(uibutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uibutton, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(uibutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uibutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uibutton, detaching);
    		}
    	};
    }

    // (215:4) {#if show}
    function create_if_block$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*props*/ ctx[2] && create_if_block_1(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*props*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*props*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (216:4) {#if props}
    function create_if_block_1(ctx) {
    	let uiform;
    	let current;

    	const uiform_spread_levels = [
    		{ cancel: /*buttons*/ ctx[4].cancel },
    		{ submit: /*buttons*/ ctx[4].submit },
    		/*props*/ ctx[2]
    	];

    	let uiform_props = {};

    	for (let i = 0; i < uiform_spread_levels.length; i += 1) {
    		uiform_props = assign(uiform_props, uiform_spread_levels[i]);
    	}

    	uiform = new Form$1({ props: uiform_props });
    	/*uiform_binding*/ ctx[12](uiform);
    	uiform.$on("change", /*_onChange*/ ctx[6]);
    	uiform.$on("submit", /*_onSubmit*/ ctx[5]);
    	uiform.$on("reject", /*toggleForm*/ ctx[3]);

    	return {
    		c() {
    			create_component(uiform.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uiform, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const uiform_changes = (dirty & /*buttons, props*/ 20)
    			? get_spread_update(uiform_spread_levels, [
    					dirty & /*buttons*/ 16 && { cancel: /*buttons*/ ctx[4].cancel },
    					dirty & /*buttons*/ 16 && { submit: /*buttons*/ ctx[4].submit },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			uiform.$set(uiform_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiform.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiform.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			/*uiform_binding*/ ctx[12](null);
    			destroy_component(uiform, detaching);
    		}
    	};
    }

    // (214:0) <UIContainer id='search-filter'>
    function create_default_slot$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*show*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let uicontainer;
    	let current;

    	uicontainer = new Ui_container({
    			props: {
    				id: "search-filter",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(uicontainer.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uicontainer, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const uicontainer_changes = {};

    			if (dirty & /*$$scope, props, form, show*/ 65543) {
    				uicontainer_changes.$$scope = { dirty, ctx };
    			}

    			uicontainer.$set(uicontainer_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uicontainer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uicontainer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(uicontainer, detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let dispatch = createEventDispatcher();
    	let { show = false } = $$props;

    	let { getAutocompleteUrl = (type, keyword) => {
    		return "/data/filter.json?format=json&name=" + encodeURIComponent(keyword) + "&type=" + encodeURIComponent(type);
    	} } = $$props;

    	let form;

    	let { fetchListOfCompletions = async (type, keyword) => {
    		keyword.trim();

    		if (keyword.length > 2) {
    			const url = getAutocompleteUrl(type, keyword);
    			const response = await fetch(url);
    			const json = await response.json();

    			if (json && json.status === "ok" && json.result) {
    				return json.result.map(itm => {
    					return { _id: itm._id, title: itm.title };
    				});
    			}

    			return [];
    		}
    	} } = $$props;

    	const fields = {
    		term: {
    			component: "UITextfield",
    			label: "",
    			placeholder: "что, где, когда?",
    			icon: "search"
    		},
    		type: {
    			component: "UISelect",
    			value: 2,
    			label: "Тип",
    			variants: [
    				{ id: 1, value: true, title: "Артист" },
    				{ id: 2, value: true, title: "Картина" },
    				{ id: 3, value: true, title: "Категория" },
    				{ id: 4, value: true, title: "Коллекция" }
    			]
    		},
    		genre: {
    			component: "UIAutocomplete",
    			label: "Жанр",
    			value: undefined,
    			searchFunction(keyword) {
    				return fetchListOfCompletions("genre", keyword);
    			}
    		},
    		cycle: {
    			component: "UIAutocomplete",
    			label: "Из цикла",
    			value: undefined,
    			searchFunction(keyword) {
    				return fetchListOfCompletions("cycle", keyword);
    			}
    		},
    		theme: {
    			component: "UIAutocomplete",
    			label: "Тема",
    			value: undefined,
    			searchFunction(keyword) {
    				return fetchListOfCompletions("theme", keyword);
    			}
    		},
    		media: {
    			component: "UIAutocomplete",
    			label: "Материал",
    			value: undefined,
    			searchFunction(keyword) {
    				return fetchListOfCompletions("media", keyword);
    			}
    		},
    		imagining: {
    			component: "UIAutocomplete",
    			label: "Изображает",
    			value: undefined,
    			searchFunction(keyword) {
    				return fetchListOfCompletions("imagining", keyword);
    			}
    		},
    		storedIn: {
    			component: "UIAutocomplete",
    			label: "Хранится в",
    			value: undefined,
    			searchFunction(keyword) {
    				return fetchListOfCompletions("storedIn", keyword);
    			}
    		},
    		locatedIn: {
    			component: "UIAutocomplete",
    			label: "Находится в",
    			value: undefined,
    			searchFunction(keyword) {
    				return fetchListOfCompletions("locatedIn", keyword);
    			}
    		}
    	};

    	const manifest = {
    		model: "search",
    		url: "/api/:modelName",
    		fields,
    		actions: {
    			search: {
    				method: "post",
    				title: "",
    				description: "",
    				fields: [
    					"term",
    					"type",
    					"genre",
    					"media",
    					"imagining",
    					"storedIn",
    					"locatedIn",
    					"theme",
    					"cycle"
    				]
    			}
    		}
    	};

    	let props = false;

    	onMount(() => {
    		$$invalidate(2, props = Form.prebuild({
    			manifest,
    			action: "search",
    			validators: Validators,
    			options: formOptions
    		}));
    	});

    	function toggleForm() {
    		$$invalidate(0, show = !show);

    		if (form) {
    			form.$set({ loading: false });
    		}
    	}

    	let buttons = {
    		cancel: { caption: "Скрыть", enabled: true },
    		submit: { caption: "Искать", enabled: true }
    	};

    	let { onChange } = $$props;
    	let { onSubmit } = $$props;
    	let { formOptions = {} } = $$props;

    	function _onSubmit({ detail }) {
    		if (typeof _onSubmit == "function") {
    			onSubmit(detail, form);
    		} else {
    			dispatch("submit", detail);
    		}
    	}

    	function _onChange({ detail }) {
    		if (typeof onChange == "function") {
    			onChange(detail, form);
    		} else {
    			dispatch("change", detail);
    		}
    	}

    	function uiform_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			form = $$value;
    			$$invalidate(1, form);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("getAutocompleteUrl" in $$props) $$invalidate(7, getAutocompleteUrl = $$props.getAutocompleteUrl);
    		if ("fetchListOfCompletions" in $$props) $$invalidate(8, fetchListOfCompletions = $$props.fetchListOfCompletions);
    		if ("onChange" in $$props) $$invalidate(9, onChange = $$props.onChange);
    		if ("onSubmit" in $$props) $$invalidate(10, onSubmit = $$props.onSubmit);
    		if ("formOptions" in $$props) $$invalidate(11, formOptions = $$props.formOptions);
    	};

    	return [
    		show,
    		form,
    		props,
    		toggleForm,
    		buttons,
    		_onSubmit,
    		_onChange,
    		getAutocompleteUrl,
    		fetchListOfCompletions,
    		onChange,
    		onSubmit,
    		formOptions,
    		uiform_binding
    	];
    }

    class Filter extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			show: 0,
    			getAutocompleteUrl: 7,
    			fetchListOfCompletions: 8,
    			onChange: 9,
    			onSubmit: 10,
    			formOptions: 11
    		});
    	}
    }

    Object.keys(FormElements).forEach((fieldtype) => {
    	Form.addComponent(fieldtype, FormElements[fieldtype]);
    });

    COMPONENTS$1.add('UIProgress', Ui_progress);
    COMPONENTS$1.add('UIUserCard', Ui_user_card);
    COMPONENTS$1.add('UISideMenuBurger', Ui_burger);
    COMPONENTS$1.add('UISampleFilter', Filter);

    /* src/standalone/cart.item.svelte generated by Svelte v3.35.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (61:4) {#each data.item.properties as item}
    function create_each_block$1(ctx) {
    	let div;
    	let span0;
    	let t0_value = /*item*/ ctx[9].title + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*item*/ ctx[9].value + "";
    	let t2;
    	let t3;

    	return {
    		c() {
    			div = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			attr(span0, "class", "cart-item-property-title svelte-1m0fuc1");
    			attr(span1, "class", "cart-item-property-value svelte-1m0fuc1");
    			attr(div, "class", "cart-item-property svelte-1m0fuc1");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, span0);
    			append(span0, t0);
    			append(div, t1);
    			append(div, span1);
    			append(span1, t2);
    			append(div, t3);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*data*/ 1 && t0_value !== (t0_value = /*item*/ ctx[9].title + "")) set_data(t0, t0_value);
    			if (dirty & /*data*/ 1 && t2_value !== (t2_value = /*item*/ ctx[9].value + "")) set_data(t2, t2_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let div5;
    	let div0;
    	let a0;
    	let uiicon0;
    	let t0;
    	let a1;
    	let t1_value = /*data*/ ctx[0].item.title + "";
    	let t1;
    	let a1_href_value;
    	let t2;
    	let div1;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t3;
    	let div2;
    	let span0;
    	let t4_value = /*data*/ ctx[0].item.description + "";
    	let t4;
    	let t5;
    	let t6;
    	let div3;
    	let a2;
    	let uiicon1;
    	let t7;
    	let span1;
    	let t8_value = /*data*/ ctx[0].quantity + "";
    	let t8;
    	let t9;
    	let a3;
    	let uiicon2;
    	let t10;
    	let div4;
    	let div5_data_id_value;
    	let current;
    	let mounted;
    	let dispose;
    	uiicon0 = new Ui_icon({ props: { font: "times" } });
    	let each_value = /*data*/ ctx[0].item.properties;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	uiicon1 = new Ui_icon({ props: { font: "minus" } });
    	uiicon2 = new Ui_icon({ props: { font: "plus" } });

    	return {
    		c() {
    			div5 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			create_component(uiicon0.$$.fragment);
    			t0 = text("\n     \n    ");
    			a1 = element("a");
    			t1 = text(t1_value);
    			t2 = space();
    			div1 = element("div");
    			img = element("img");
    			t3 = space();
    			div2 = element("div");
    			span0 = element("span");
    			t4 = text(t4_value);
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			div3 = element("div");
    			a2 = element("a");
    			create_component(uiicon1.$$.fragment);
    			t7 = space();
    			span1 = element("span");
    			t8 = text(t8_value);
    			t9 = space();
    			a3 = element("a");
    			create_component(uiicon2.$$.fragment);
    			t10 = space();
    			div4 = element("div");
    			attr(a0, "href", "");
    			attr(a0, "class", "has-text-danger svelte-1m0fuc1");
    			attr(a1, "href", a1_href_value = /*data*/ ctx[0].item.url);
    			attr(a1, "class", "svelte-1m0fuc1");
    			attr(div0, "class", "column is-3 cart-item-title svelte-1m0fuc1");
    			if (img.src !== (img_src_value = /*data*/ ctx[0].item.image.micro)) attr(img, "src", img_src_value);
    			attr(img, "alt", img_alt_value = /*data*/ ctx[0].item.title);
    			attr(img, "class", "svelte-1m0fuc1");
    			attr(div1, "class", "column image is-2 is-hidden-touch svelte-1m0fuc1");
    			attr(span0, "class", "cart-item-description svelte-1m0fuc1");
    			attr(div2, "class", "column description is-3 is-hidden-touch svelte-1m0fuc1");
    			attr(a2, "href", "");
    			attr(a2, "class", "has-text-dark svelte-1m0fuc1");
    			attr(span1, "class", "ml-1 mr-1 svelte-1m0fuc1");
    			attr(a3, "href", "");
    			attr(a3, "class", "has-text-dark svelte-1m0fuc1");
    			attr(div3, "class", "column quantity is-2 svelte-1m0fuc1");
    			attr(div4, "class", "column total-price is-1 svelte-1m0fuc1");
    			attr(div5, "class", "item columns mr-3 is-vcentered svelte-1m0fuc1");
    			attr(div5, "data-id", div5_data_id_value = /*data*/ ctx[0].id);
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div0);
    			append(div0, a0);
    			mount_component(uiicon0, a0, null);
    			append(div0, t0);
    			append(div0, a1);
    			append(a1, t1);
    			append(div5, t2);
    			append(div5, div1);
    			append(div1, img);
    			append(div5, t3);
    			append(div5, div2);
    			append(div2, span0);
    			append(span0, t4);
    			append(div2, t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append(div5, t6);
    			append(div5, div3);
    			append(div3, a2);
    			mount_component(uiicon1, a2, null);
    			append(div3, t7);
    			append(div3, span1);
    			append(span1, t8);
    			append(div3, t9);
    			append(div3, a3);
    			mount_component(uiicon2, a3, null);
    			append(div5, t10);
    			append(div5, div4);
    			div4.innerHTML = /*priceItem*/ ctx[1];
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(a0, "click", prevent_default(/*itemRemove*/ ctx[4])),
    					listen(a2, "click", prevent_default(/*quantityMinus*/ ctx[2])),
    					listen(a3, "click", prevent_default(/*quantityPlus*/ ctx[3]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if ((!current || dirty & /*data*/ 1) && t1_value !== (t1_value = /*data*/ ctx[0].item.title + "")) set_data(t1, t1_value);

    			if (!current || dirty & /*data*/ 1 && a1_href_value !== (a1_href_value = /*data*/ ctx[0].item.url)) {
    				attr(a1, "href", a1_href_value);
    			}

    			if (!current || dirty & /*data*/ 1 && img.src !== (img_src_value = /*data*/ ctx[0].item.image.micro)) {
    				attr(img, "src", img_src_value);
    			}

    			if (!current || dirty & /*data*/ 1 && img_alt_value !== (img_alt_value = /*data*/ ctx[0].item.title)) {
    				attr(img, "alt", img_alt_value);
    			}

    			if ((!current || dirty & /*data*/ 1) && t4_value !== (t4_value = /*data*/ ctx[0].item.description + "")) set_data(t4, t4_value);

    			if (dirty & /*data*/ 1) {
    				each_value = /*data*/ ctx[0].item.properties;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if ((!current || dirty & /*data*/ 1) && t8_value !== (t8_value = /*data*/ ctx[0].quantity + "")) set_data(t8, t8_value);
    			if (!current || dirty & /*priceItem*/ 2) div4.innerHTML = /*priceItem*/ ctx[1];
    			if (!current || dirty & /*data*/ 1 && div5_data_id_value !== (div5_data_id_value = /*data*/ ctx[0].id)) {
    				attr(div5, "data-id", div5_data_id_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uiicon0.$$.fragment, local);
    			transition_in(uiicon1.$$.fragment, local);
    			transition_in(uiicon2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uiicon0.$$.fragment, local);
    			transition_out(uiicon1.$$.fragment, local);
    			transition_out(uiicon2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div5);
    			destroy_component(uiicon0);
    			destroy_each(each_blocks, detaching);
    			destroy_component(uiicon1);
    			destroy_component(uiicon2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let priceItem;
    	let dispatch = createEventDispatcher();
    	let { moneySign = "&#8381;" } = $$props;
    	let { data = {} } = $$props;

    	function quantityChange(change) {
    		$$invalidate(0, data.quantity += change, data);

    		dispatch("quantity.change", {
    			id: data.id,
    			change,
    			quantity: data.quantity
    		});
    	}

    	function quantityMinus() {
    		quantityChange(-1);
    	}

    	function quantityPlus() {
    		quantityChange(1);
    	}

    	function itemRemove() {
    		dispatch("item.remove", { id: data.id });
    	}

    	function formatPrice(price) {
    		let rub = parseInt(Math.floor(price / 100)), cop = parseInt(price % 100);
    		rub = "" + rub;
    		return `${moneySign}${rub}.${cop}`;
    	}

    	$$self.$$set = $$props => {
    		if ("moneySign" in $$props) $$invalidate(5, moneySign = $$props.moneySign);
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(1, priceItem = formatPrice(parseFloat(data.item.price) * parseInt(data.quantity)));
    		}
    	};

    	return [data, priceItem, quantityMinus, quantityPlus, itemRemove, moneySign];
    }

    class Cart_item extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { moneySign: 5, data: 0 });
    	}
    }

    /* src/standalone/cart.svelte generated by Svelte v3.35.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	child_ctx[26] = list;
    	child_ctx[27] = i;
    	return child_ctx;
    }

    // (93:5) {#each content as item}
    function create_each_block(ctx) {
    	let notcartitem;
    	let updating_data;
    	let current;

    	function notcartitem_data_binding(value) {
    		/*notcartitem_data_binding*/ ctx[17](value, /*item*/ ctx[25], /*each_value*/ ctx[26], /*item_index*/ ctx[27]);
    	}

    	let notcartitem_props = {};

    	if (/*item*/ ctx[25] !== void 0) {
    		notcartitem_props.data = /*item*/ ctx[25];
    	}

    	notcartitem = new Cart_item({ props: notcartitem_props });
    	binding_callbacks.push(() => bind(notcartitem, "data", notcartitem_data_binding));
    	notcartitem.$on("quantity.change", /*onItemQuantityChange*/ ctx[10]);
    	notcartitem.$on("item.remove", /*onItemRemove*/ ctx[11]);

    	return {
    		c() {
    			create_component(notcartitem.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(notcartitem, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const notcartitem_changes = {};

    			if (!updating_data && dirty & /*content*/ 8) {
    				updating_data = true;
    				notcartitem_changes.data = /*item*/ ctx[25];
    				add_flush_callback(() => updating_data = false);
    			}

    			notcartitem.$set(notcartitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(notcartitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(notcartitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(notcartitem, detaching);
    		}
    	};
    }

    // (86:0) <UIOverlay on:reject="{overlayClosed}" bind:this={overlay} bind:show={show} {closeOnClick} {closeButton}>
    function create_default_slot(ctx) {
    	let div4;
    	let div3;
    	let h2;
    	let t0;
    	let t1;
    	let h3;
    	let t2;
    	let t3;
    	let t4;
    	let span;
    	let t5;
    	let div2;
    	let div0;
    	let t6;
    	let div1;
    	let uibutton0;
    	let t7;
    	let uibutton1;
    	let current;
    	let each_value = /*content*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	uibutton0 = new Ui_button({
    			props: {
    				action: /*closeCart*/ ctx[12],
    				title: "Закрыть",
    				color: "secondary",
    				classes: "cart-form-close"
    			}
    		});

    	uibutton1 = new Ui_button({
    			props: {
    				action: /*startOrder*/ ctx[13],
    				title: "Заказать",
    				disabled: /*isEmpty*/ ctx[8],
    				raised: true,
    				color: "primary",
    				classes: "cart-form-order"
    			}
    		});

    	return {
    		c() {
    			div4 = element("div");
    			div3 = element("div");
    			h2 = element("h2");
    			t0 = text(/*title*/ ctx[6]);
    			t1 = space();
    			h3 = element("h3");
    			t2 = text("Всего товаров: ");
    			t3 = text(/*totalQuantity*/ ctx[1]);
    			t4 = text(", общей стоимостью: ");
    			span = element("span");
    			t5 = space();
    			div2 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			div1 = element("div");
    			create_component(uibutton0.$$.fragment);
    			t7 = space();
    			create_component(uibutton1.$$.fragment);
    			attr(h2, "class", "title is-2");
    			attr(span, "class", "total-price");
    			attr(h3, "class", "subtitle is-3");
    			attr(div0, "class", "cart-list-items-content svelte-urhlju");
    			attr(div1, "class", "buttons is-grouped is-centered mt-4");
    			attr(div2, "class", "content");
    			attr(div3, "class", "box svelte-urhlju");
    			attr(div4, "class", "cart-list-items-paper svelte-urhlju");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div3);
    			append(div3, h2);
    			append(h2, t0);
    			append(div3, t1);
    			append(div3, h3);
    			append(h3, t2);
    			append(h3, t3);
    			append(h3, t4);
    			append(h3, span);
    			span.innerHTML = /*totalPrice*/ ctx[2];
    			append(div3, t5);
    			append(div3, div2);
    			append(div2, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append(div2, t6);
    			append(div2, div1);
    			mount_component(uibutton0, div1, null);
    			append(div1, t7);
    			mount_component(uibutton1, div1, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*title*/ 64) set_data(t0, /*title*/ ctx[6]);
    			if (!current || dirty & /*totalQuantity*/ 2) set_data(t3, /*totalQuantity*/ ctx[1]);
    			if (!current || dirty & /*totalPrice*/ 4) span.innerHTML = /*totalPrice*/ ctx[2];
    			if (dirty & /*content, onItemQuantityChange, onItemRemove*/ 3080) {
    				each_value = /*content*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const uibutton1_changes = {};
    			if (dirty & /*isEmpty*/ 256) uibutton1_changes.disabled = /*isEmpty*/ ctx[8];
    			uibutton1.$set(uibutton1_changes);
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(uibutton0.$$.fragment, local);
    			transition_in(uibutton1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(uibutton0.$$.fragment, local);
    			transition_out(uibutton1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			destroy_each(each_blocks, detaching);
    			destroy_component(uibutton0);
    			destroy_component(uibutton1);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let uioverlay;
    	let updating_show;
    	let current;

    	function uioverlay_show_binding(value) {
    		/*uioverlay_show_binding*/ ctx[19](value);
    	}

    	let uioverlay_props = {
    		closeOnClick: /*closeOnClick*/ ctx[4],
    		closeButton: /*closeButton*/ ctx[5],
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*show*/ ctx[0] !== void 0) {
    		uioverlay_props.show = /*show*/ ctx[0];
    	}

    	uioverlay = new Ui_overlay({ props: uioverlay_props });
    	/*uioverlay_binding*/ ctx[18](uioverlay);
    	binding_callbacks.push(() => bind(uioverlay, "show", uioverlay_show_binding));
    	uioverlay.$on("reject", /*overlayClosed*/ ctx[9]);

    	return {
    		c() {
    			create_component(uioverlay.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(uioverlay, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const uioverlay_changes = {};
    			if (dirty & /*closeOnClick*/ 16) uioverlay_changes.closeOnClick = /*closeOnClick*/ ctx[4];
    			if (dirty & /*closeButton*/ 32) uioverlay_changes.closeButton = /*closeButton*/ ctx[5];

    			if (dirty & /*$$scope, isEmpty, content, totalPrice, totalQuantity, title*/ 268435790) {
    				uioverlay_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_show && dirty & /*show*/ 1) {
    				updating_show = true;
    				uioverlay_changes.show = /*show*/ ctx[0];
    				add_flush_callback(() => updating_show = false);
    			}

    			uioverlay.$set(uioverlay_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(uioverlay.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(uioverlay.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			/*uioverlay_binding*/ ctx[18](null);
    			destroy_component(uioverlay, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let overlay;
    	let dispatch = createEventDispatcher();
    	let { totalQuantity = 0 } = $$props;
    	let { totalPrice = 0 } = $$props;
    	let { closeOnClick = true } = $$props;
    	let { closeButton = false } = $$props;
    	let { content = [] } = $$props;
    	let { show = false } = $$props;
    	let { moneySign = "&#8381;" } = $$props;
    	let { title = "Ваша корзина" } = $$props;
    	let { updateNow = 0 } = $$props;

    	let { update = () => {
    		$$invalidate(3, content);
    	} } = $$props;

    	let isEmpty = false;

    	function overlayClosed() {
    		overlay.$set({ show: false });
    	}

    	function formatPrice(price) {
    		let rub = parseInt(Math.floor(price / 100)), cop = parseInt(price % 100);
    		rub = "" + rub;
    		return `${moneySign}${rub}.${cop}`;
    	}

    	function getTotalPrice() {
    		let func = (total, item) => total + item.quantity * item.item.price;
    		return content.length ? content.reduce(func, 0) : 0;
    	}

    	function getTotalQuantity() {
    		let func = (total, item) => total + item.quantity;
    		return content.length ? content.reduce(func, 0) : 0;
    	}

    	function updateTotals() {
    		$$invalidate(1, totalQuantity = getTotalQuantity());
    		$$invalidate(2, totalPrice = formatPrice(getTotalPrice()));
    		$$invalidate(8, isEmpty = totalQuantity === 0);
    	}

    	function onItemQuantityChange(ev) {
    		dispatch("quantity.change", ev.detail);
    		updateTotals();
    	}

    	function onItemRemove(ev) {
    		dispatch("item.remove", ev.detail);
    		updateTotals();
    	}

    	function closeCart() {
    		$$invalidate(0, show = false);
    	}

    	function startOrder() {
    		dispatch("order");
    	}

    	function notcartitem_data_binding(value, item, each_value, item_index) {
    		each_value[item_index] = value;
    		$$invalidate(3, content);
    	}

    	function uioverlay_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			overlay = $$value;
    			$$invalidate(7, overlay);
    		});
    	}

    	function uioverlay_show_binding(value) {
    		show = value;
    		$$invalidate(0, show);
    	}

    	$$self.$$set = $$props => {
    		if ("totalQuantity" in $$props) $$invalidate(1, totalQuantity = $$props.totalQuantity);
    		if ("totalPrice" in $$props) $$invalidate(2, totalPrice = $$props.totalPrice);
    		if ("closeOnClick" in $$props) $$invalidate(4, closeOnClick = $$props.closeOnClick);
    		if ("closeButton" in $$props) $$invalidate(5, closeButton = $$props.closeButton);
    		if ("content" in $$props) $$invalidate(3, content = $$props.content);
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("moneySign" in $$props) $$invalidate(14, moneySign = $$props.moneySign);
    		if ("title" in $$props) $$invalidate(6, title = $$props.title);
    		if ("updateNow" in $$props) $$invalidate(15, updateNow = $$props.updateNow);
    		if ("update" in $$props) $$invalidate(16, update = $$props.update);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*show, updateNow, update*/ 98305) {
    			{
    				(update());
    			}
    		}

    		if ($$self.$$.dirty & /*show*/ 1) {
    			(updateTotals());
    		}
    	};

    	return [
    		show,
    		totalQuantity,
    		totalPrice,
    		content,
    		closeOnClick,
    		closeButton,
    		title,
    		overlay,
    		isEmpty,
    		overlayClosed,
    		onItemQuantityChange,
    		onItemRemove,
    		closeCart,
    		startOrder,
    		moneySign,
    		updateNow,
    		update,
    		notcartitem_data_binding,
    		uioverlay_binding,
    		uioverlay_show_binding
    	];
    }

    class Cart extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			totalQuantity: 1,
    			totalPrice: 2,
    			closeOnClick: 4,
    			closeButton: 5,
    			content: 3,
    			show: 0,
    			moneySign: 14,
    			title: 6,
    			updateNow: 15,
    			update: 16
    		});
    	}
    }

    /* src/standalone/cart.icon.svelte generated by Svelte v3.35.0 */

    function create_if_block(ctx) {
    	let div;
    	let a;
    	let span;
    	let t;
    	let span_class_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			a = element("a");
    			span = element("span");
    			t = text(/*count*/ ctx[0]);
    			attr(span, "class", span_class_value = "cart-icon-count " + (/*cartUpdated*/ ctx[2] ? "updated" : "") + " svelte-z4a9ku");
    			attr(a, "href", "");
    			attr(a, "class", "cart-icon-fixed svelte-z4a9ku");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, a);
    			append(a, span);
    			append(span, t);

    			if (!mounted) {
    				dispose = listen(a, "click", /*dispatchClick*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*count*/ 1) set_data(t, /*count*/ ctx[0]);

    			if (dirty & /*cartUpdated*/ 4 && span_class_value !== (span_class_value = "cart-icon-count " + (/*cartUpdated*/ ctx[2] ? "updated" : "") + " svelte-z4a9ku")) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let if_block_anchor;
    	let if_block = /*show*/ ctx[1] && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (/*show*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { count = 0 } = $$props;
    	let { show = true } = $$props;
    	let { animationDuration = 600 } = $$props;
    	let cartUpdated = false;

    	function update() {
    		$$invalidate(2, cartUpdated = true);

    		setTimeout(
    			() => {
    				$$invalidate(2, cartUpdated = false);
    			},
    			animationDuration
    		);
    	}

    	let dispatch = createEventDispatcher();

    	function dispatchClick(e) {
    		e.preventDefault();
    		dispatch("click", {});
    		return false;
    	}

    	$$self.$$set = $$props => {
    		if ("count" in $$props) $$invalidate(0, count = $$props.count);
    		if ("show" in $$props) $$invalidate(1, show = $$props.show);
    		if ("animationDuration" in $$props) $$invalidate(4, animationDuration = $$props.animationDuration);
    	};

    	return [count, show, cartUpdated, dispatchClick, animationDuration, update];
    }

    class Cart_icon extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			count: 0,
    			show: 1,
    			animationDuration: 4,
    			update: 5
    		});
    	}

    	get update() {
    		return this.$$.ctx[5];
    	}
    }

    //import "../styles/common/common.css";

    const OPT_DEFAULT_ANIMATION_DURATION = 600;
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
        }else {
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
        }else {
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
        const response = await fetch(url, {...opts,
          method: 'PUT', // *GET, POST, PUT, DELETE, etc.
          body: JSON.stringify(data) // body data type must match "Content-Type" header
        });
        return await response.json(); // parses JSON response into native JavaScript objects
      }

      async postData(url, data) {
        let opts = this.getStandartRequestOptions();
        const response = await fetch(url, {...opts,
          method: 'POST', // *GET, POST, PUT, DELETE, etc.
          body: JSON.stringify(data) // body data type must match "Content-Type" header
        });
        return await response.json(); // parses JSON response into native JavaScript objects
      }

      async getData(url) {
        let opts = this.getStandartRequestOptions();
        const response = await fetch(url, {...opts,
          method: 'GET'
        });
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
        this.ui.icon = new Cart_icon({
          target: document.body,
          props:{
            count: this.content.length,
            animationDuration: this.getAnimationDuration(),
          }
        });
        this.ui.icon.$on('click', this.showList.bind(this));
    	}

      initUICart() {
        this.ui.cart = new Cart({
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
          this.ui.icon.update();
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

    exports.CartComponent = Cart;
    exports.CartIconComponent = Cart_icon;
    exports.CartItemComponent = Cart_item;
    exports.notCart = notCart;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

}({}));
