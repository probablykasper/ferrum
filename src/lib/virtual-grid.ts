type Column = {
	key: string
	width: number
	is_pct?: true
	offset?: number
}

/** Note that parentElement is not reactive */
export class VirtualGrid<T> {
	main_element?: HTMLElement
	viewport?: HTMLElement
	size_observer?: ResizeObserver
	row_setup?: (element: HTMLElement, item: T, index: number) => void
	constructor() {}

	row_height = 24
	buffer = 5

	items: T[] = []
	set_items(items: T[]) {
		this.items = items
		this.#set_size()
	}

	visible_count = 0

	refreshing = false
	#get_visible_count() {
		const viewport_height = this.viewport?.clientHeight ?? 0
		return Math.ceil(viewport_height / this.row_height)
	}
	#set_size() {
		this.visible_count = this.#get_visible_count()
		const height = this.items.length * this.row_height
		if (this.main_element) {
			this.main_element.style.height = height + 'px'
		}
		this.refresh()
	}

	visible_indexes: number[] = []
	rows: HTMLElement[] = []

	refresh() {
		if (this.refreshing) {
			return
		}
		this.refreshing = true

		requestAnimationFrame(() => {
			if (!this.viewport) {
				return
			}
			const start_time = performance.now()
			this.refreshing = false

			const rendered_count = this.visible_count + this.buffer * 2

			let start_index = Math.max(
				0,
				Math.floor(this.viewport.scrollTop / this.row_height - this.buffer),
			)
			const end_index = Math.min(this.items.length - 1, start_index - 1 + rendered_count)
			if (end_index - start_index + 1 < rendered_count) {
				// fill backwards when scrolled to the end
				start_index = Math.max(0, end_index + 1 - rendered_count)
			}

			// figure out which indexes should now be visible
			const new_visible_indexes: number[] = []
			for (let i = start_index; i <= end_index; i++) {
				if (!this.visible_indexes.includes(i)) {
					new_visible_indexes.push(i)
				}
			}
			// update the visible indexes
			for (let i = 0; i < this.visible_indexes.length; i++) {
				const still_visible =
					this.visible_indexes[i] >= start_index && this.visible_indexes[i] <= end_index
				if (!still_visible) {
					const new_index = new_visible_indexes.pop()
					if (new_index !== undefined) {
						// update it to a new visible index
						this.visible_indexes[i] = new_index
					} else {
						// if there are no new visible indexes left, remove it
						this.visible_indexes.splice(i, 1)
						i--
					}
				}
			}
			if (new_visible_indexes.length > 0) {
				// add new visible indexes
				this.visible_indexes.push(...new_visible_indexes)
			}
			this.render()
			console.log(`Render ${(performance.now() - start_time).toFixed(1)}ms`)
		})
	}

	columns: Column[] = []
	set_columns(columns: Column[]) {
		this.columns = columns
		this.rows = []
		this.refresh()
	}

	render() {
		if (this.rows.length < this.visible_indexes.length) {
			// add new rows
			for (let i = this.rows.length; i < this.visible_indexes.length; i++) {
				const row = document.createElement('div')
				row.className = 'row'
				row.setAttribute('role', 'row')
				row.setAttribute('draggable', 'true')
				this.rows.push(row)
				this.main_element?.appendChild(row)

				for (const column of this.columns) {
					const cell = document.createElement('div')
					cell.className = `cell ${column.key}`
					cell.style.width = `${column.width}px`
					cell.style.translate = `${column.offset}px 0`
					row.appendChild(cell)

					cell.innerHTML = 'xxxxxx'
				}
			}
		}

		const removed_rows = []
		for (let i = 0; i < this.rows.length; i++) {
			const row = this.rows[i]
			const item_index = this.visible_indexes[i]
			if (item_index === undefined) {
				removed_rows.push(row)
			} else {
				row.style.translate = `0 ${item_index * this.row_height}px`
				row.setAttribute('aria-rowindex', String(item_index + 1))
				if (this.row_setup) {
					this.row_setup(row, this.items[item_index], item_index)
				}
			}
		}
		for (const row of removed_rows) {
			row.remove()
			this.rows.splice(this.rows.indexOf(row), 1)
		}
	}

	setup(
		node: HTMLElement,
		options: { row_setup?: (element: HTMLElement, item: T, index: number) => void },
	) {
		this.row_setup = options.row_setup

		this.main_element = node

		const viewport_result = this.main_element.parentElement
		if (!viewport_result) {
			throw new Error('No viewport')
		}
		this.viewport = viewport_result

		this.#set_size()

		this.size_observer = new ResizeObserver(() => {
			this.#set_size()
		})
		this.size_observer.observe(this.viewport)

		const on_scroll = () => this.refresh()
		this.viewport.addEventListener('scroll', on_scroll)
		return () => {
			this.viewport?.removeEventListener('scroll', on_scroll)
			this.size_observer?.disconnect()
		}
	}
	attach(options: Parameters<typeof this.setup>[1]) {
		return (node: HTMLElement) => this.setup(node, options)
	}
}
