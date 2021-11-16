const { h, render } = require('../lib/jsx')
const { escapeHTML } = require('../lib/utils')
const { expect } = require('chai')

describe('jsx', () => {
  it('should render jsx', () => {
    const Bla = props => h('div', null, props.name)
    const html = render(h(Bla, { name: 'yannick' }))
    expect(html).to.equal('<div>yannick</div>')
  })

  it('should render and escape html', () => {
    const Bla = props => h('div', null, escapeHTML(props.name))
    const html = render(h(Bla, { name: 'yanni<k' }))
    expect(html).to.equal('<div>yanni&lt;k</div>')
  })

  it('should render and NOT escape html', () => {
    const Bla = props => h('div', null, props.name)
    const html = render(h(Bla, { name: 'yanni<k' }))
    expect(html).to.equal('<div>yanni<k</div>')
  })
})
