import { MODULE } from '../constants.js'

/**
 * Form Application for the dialogs.
 */
export class TagDialog extends FormApplication {
    tagify = null
    dragSort = null

    constructor (data) {
        super(data, { title: data.title })
        this.content = data.content
        this.submit = data.submit
        this.categoryId = null
        this.subcategoryId = null
    }

    static get defaultOptions () {
        const defaults = super.defaultOptions
        const overrides = {
            closeOnSubmit: true,
            id: 'token-action-hud-dialog',
            template: `modules/${MODULE.ID}/templates/tagdialog.hbs`,
            width: 500
        }

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides)

        return mergedOptions
    }

    getData (options) {
        return this.content
    }

    /**
     * Activate listeners
     * @param {object} html The HTML element
     */
    activateListeners (html) {
        super.activateListeners(html)
        const cancel = html.find('#tah-dialog-cancel')
        cancel.on('click', this.close.bind(this))
    }

    /**
     * Show dialog
     * @public
     * @param {string} nestId          The nested subcategory ID
     * @param {object} tags            The available and selected tags
     * @param {object} dialogData      The dialog data
     * @param {function*} dialogSubmit The dialog submit function
     */
    static showDialog (nestId, tags, dialogData, dialogSubmit) {
        this.nestId = nestId
        TagDialog._prepareHook(tags)

        const dialog = new TagDialog({
            title: dialogData.title,
            content: dialogData.content,
            submit: dialogSubmit
        })

        dialog.render(true)
    }

    /**
     * Prepare dialog hook
     * @param {object} tags The tags
     */
    static _prepareHook (tags) {
        Hooks.once('renderTagDialog', (app, html, options) => {
            html.css('height', 'auto')

            const $index = html.find('select[id="token-action-hud-index"]')
            if ($index.length > 0) {
                $index.css('background', '#fff')
                $index.css('color', '#000')
            }

            const $tagFilter = html.find('input[class="token-action-hud-taginput"]')

            if ($tagFilter.length > 0) {
                const options = {
                    delimiters: ';',
                    maxTags: 'Infinity',
                    dropdown: {
                        maxItems: 50, // <- maximum allowed rendered suggestions
                        classname: 'tags-look', // <- custom classname for this dropdown, so it could be targeted
                        enabled: 0, // <- show suggestions on focus
                        closeOnSelect: false // <- do not hide the suggestions dropdown once an item has been selected
                    }
                }

                if (tags.available) options.whitelist = tags.available

                TagDialog.tagify = new Tagify($tagFilter[0], options)

                TagDialog.dragSort = new DragSort(TagDialog.tagify.DOM.scope, {
                    selector: '.' + TagDialog.tagify.settings.classNames.tag,
                    callbacks: { dragEnd: onDragEnd }
                })

                function onDragEnd (elm) {
                    TagDialog.tagify.updateValueByDOMTags()
                }

                const $tagifyBox = $(document).find('.tagify')

                $tagifyBox.css('background', '#fff')
                $tagifyBox.css('color', '#000')

                if (tags.selected) TagDialog.tagify.addTags(tags.selected)

                // "remove all tags" button event listener
                const clearBtn = html.find('#tah-dialog-clear-tags')
                clearBtn.on('click', TagDialog.tagify.removeAllTags.bind(TagDialog.tagify))
            }
        })
    }

    /** @override */
    _onKeyDown (event) {
    // Close dialog
        if (event.key === 'Escape' && !event.target.className.includes('tagify')) {
            event.preventDefault()
            event.stopPropagation()
            return this.close()
        }

        // Confirm default choice
        if (
            event.key === 'Enter' &&
            this.data.default &&
            !event.target.className.includes('tagify')
        ) {
            event.preventDefault()
            event.stopPropagation()
            const defaultChoice = this.data.buttons[this.data.default]
            return this.submit(defaultChoice)
        }
    }

    /**
     * Handle form submission
     * @param {object} event       The event
     * @param {object} formDataThe form data
     */
    async _updateObject (event, formData) {
        const selection = TagDialog.tagify.value.map((c) => {
            c.id = c.id ?? c.value.slugify({ replacement: '-', strict: true })
            return {
                id: c.id,
                name: c.value,
                type: c.type,
                level: c.level,
                hasDerivedSubcategories: c.hasDerivedSubcategories
            }
        })
        await this.submit(selection, formData)
    }
}
