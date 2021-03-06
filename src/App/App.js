import storage from '../storage'
import React from 'react'
import { Link, browserHistory } from 'react-router'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import * as types from '../actions'
import Helmet from 'react-helmet'
import moment from 'moment'

import { Icon, Modal, Image, Divider } from 'semantic-ui-react'
import { VelocityComponent } from 'velocity-react'
import Settings from '../Settings/Settings'
import './App.css'

moment.updateLocale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s',
    s:  '1s',
    ss: '%ss',
    m:  '1m',
    mm: '%dm',
    h:  '1h',
    hh: '%dh',
    d:  '1d',
    dd: '%dd',
    M:  '1m',
    MM: '%dM',
    y:  '1y',
    yy: '%dY'
  }
})

class HoverListItem extends React.PureComponent {
  state = {
    hovering: false,
  }
  componentDidMount() {
    this.rect = this.refs.element.getBoundingClientRect()
  }
  componentWillReceiveProps({ x, y }) {
    let hovering = false
    if(this.rect.left <= x && x <= this.rect.right && this.rect.top <= y && y <= this.rect.bottom) {
      hovering = true
    }
    this.setState({ hovering })
  }
  render() {
    return (
      <li id={ this.props.id } ref="element" style={{ background: this.state.hovering ? 'rgba(128, 128, 128, .15)' : 'none' }}>
        { this.props.children }
      </li>
    )
  }
}

class App extends React.PureComponent {
  state = {
    drawerOpen: false,
    modalOpen: false,
    actionHelper: null,
    pointerXY: {},
  }

  async componentDidMount() {
    const deviceToken = storage.getItem('dt')
    if (!deviceToken) {
      const possible = '0123456789abcdef'
      let text = ''
      for (let i = 0; i < 40; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length))
      }
      storage.setItem('dt', text)
    }
    const isLight = JSON.parse(storage.getItem('lui'))
    if (isLight && this.props.app.darkMode) {
      this.props.actions.onToggleDarkMode()
    }
    const isOffice = JSON.parse(storage.getItem('mtr'))
    if (isOffice && !this.props.app.officeMode) {
      this.props.actions.onToggleOfficeMode()
    }
    const isSplit = JSON.parse(storage.getItem('spl'))
    if (isSplit && !this.props.app.splitMode) {
      this.props.actions.onToggleSplitMode()
    }

    let list
    try {
      list = await fetch('https://lihkg.com/api_v1/system/property')
      list = await list.json()
      list = list.response.category_list
    } catch(e) {
      location.reload(true)
    }
    this.props.actions.onSetCategories(list)

    setTimeout(() => document.body.style.opacity = 1, 400)
  }

  scrollToTop() {
    let scrollCount = 0
    let oldTimestamp = performance.now()
    const scrollDuration = 250
    const cosParameter = window.scrollY / 2
    function step(newTimestamp) {
      scrollCount += Math.PI / (scrollDuration / (newTimestamp - oldTimestamp))
      if (scrollCount >= Math.PI) window.scrollTo(0, 0)
      if (window.scrollY === 0) return
      window.scrollTo(0, Math.round(cosParameter + cosParameter * Math.cos(scrollCount)))
      oldTimestamp = newTimestamp
      window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }

  trigger = false
  resetTimeout = 0
  showTimeout = 0

  render() {
    let { user } = this.props.app.user
    const linkRef = e => this.settings = e
    const children = React.Children.map(this.props.children, child => React.cloneElement(child, { ...this.props }))
    const toggleDrawer = e => {
      e.preventDefault()
      this.setState({ drawerOpen: !this.state.drawerOpen }, () => {
        document.body.style.overflow = this.state.drawerOpen ? 'hidden' : 'visible'
      })
    }
    const linkTo = (path, e) => {
      browserHistory.push(path)
      toggleDrawer(e)
    }
    const goBookmark = linkTo.bind(null, '/bookmark')
    const goSearch = linkTo.bind(null, '/search')
    const toggleSettings = () => this.settings.toggle()
    const toggleModal = () => this.setState({ modalOpen: !this.state.modalOpen })
    const drawer = (
      <div className="App-drawer">
        <div className="App-drawer-upper">
          { user ? <div className="App-drawer-item" onClick={ goBookmark }>留名</div> : null }
          <div className="App-drawer-item" onClick={ goSearch }>搜尋</div>
          <div className="App-drawer-item" onClick={ toggleSettings }>設定</div>
          <div className="App-drawer-item" onClick={ toggleModal }>關於</div>
        </div>
        <Divider/>
        <div className="App-drawer-lower">
          { this.props.app.categories.map(c => {
            const click = e => {
              toggleDrawer(e)
              setTimeout(browserHistory.push.bind(null, `/category/${ c.cat_id }`), 250 + 50)
            }
            return <div key={ c.cat_id } className="App-drawer-item" onClick={ click }>{ c.name }</div>
          }) }
        </div>
      </div>
    )
    /*  Action Helper  */
    const onUp = e => {
      clearTimeout(this.showTimeout)
      if (this.state.actionHelper !== null) {
        const elem = document.elementFromPoint(this.state.pointerXY.x, this.state.pointerXY.y)
        const selected = this.props.app.pageActions.find(x => x.id === elem.id)
        if (selected) {
          selected.callback()
        }
        this.setState({ actionHelper: null })
      }
    }
    const onDown = e => {
      if (this.props.app.pageActions.length < 1 || (e.button && e.button !== 0)) {
        return
      }
      const x = e.touches ? e.touches[0].clientX : e.clientX || 0
      const y = e.touches ? e.touches[0].clientY : e.clientY || 0
      if (this.trigger) {
        clearTimeout(this.resetTimeout)
        this.showTimeout = setTimeout(() => {
          this.setState({ actionHelper: { x, y } })
        }, 300)
      }
      this.resetTimeout = setTimeout(() => this.trigger = false, 350)
      this.trigger = true
    }
    const onMove = e => {
      if (this.state.actionHelper) {
        e.preventDefault()
      }
      const x = e.touches ? e.touches[0].clientX : e.clientX || 0
      const y = e.touches ? e.touches[0].clientY : e.clientY || 0
      this.setState({ pointerXY: { x, y } })
    }
    const showUpdate = () => alert('新功能：在任意地方雙按後不放手，即可打開動作選單')

    return (
      <div
        className={ `App ${ this.props.app.darkMode ? 'dark' : 'light' } ${ this.state.actionHelper ? 'noselect' : '' }` }
        onMouseDown={ onDown }
        onMouseMove={ onMove }
        onMouseUp={ onUp }
        onTouchStart={ onDown }
        onTouchMove={ onMove }
        onTouchEnd={ onUp }>
        <Helmet title={ this.props.app.officeMode ? 'LIHKG Web' : this.props.app.pageTitle }/>
        <header>
          <div>
            <div className="App-headerLeft">
              <a id="menu" href="#" onClick={ toggleDrawer } style={{ textDecoration: 'none' }}>
                <Icon name="content" size="large"/>
              </a>
              <div className="App-whatsNew" onClick={ showUpdate }></div>
              <span style={{ fontWeight: 'bold' }}>LIHKG 討論區</span>
            </div>
            <div className="App-headerRight">{
              !user ? <div>
                <Link to="/auth/login">登入</Link>
                <span style={{ color: '#888' }}> | </span>
                <a target="_blank" href="https://lihkg.com/register">註冊</a>
              </div> : <div>
                { this.props.app.officeMode ? null : user.nickname } <Link to="/auth/logout">(登出)</Link>
              </div>
            }</div>
          </div>
        </header>
        <Modal size="small" open={ this.state.modalOpen } onClose={ toggleModal }>
          <Modal.Header>LIHKG Web</Modal.Header>
          <Modal.Content image>
            <Image wrapped size="small" src='https://camo.githubusercontent.com//72d1ef1620c2cfbec36c476248b9e65cf4d3757f//68747470733a2f2f782e6c69686b672e636f6d2f6173736574732f696d672f6c6f676f322e706e67' />
            <Modal.Description>
              此 LIHKG 閱讀器由 <a target="_blank" href="https://na.cx">nasece cloud</a> 提供並非 LIHKG 官方發佈
              <br/>
              請詳閱 <a target="_blank" href="https://lihkg.com/tnc">LIHKG 使用條款</a>。如想支持本站，歡迎按此捐款
              <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank" style={{ display: 'inline-block' }}>
                <input type="hidden" name="cmd" value="_s-xclick"/>
                <input type="hidden" name="hosted_button_id" value="6QZX62BVJY6EQ"/>
                <input type="image" alt="" src="https://www.paypalobjects.com/en_GB/i/btn/btn_donate_SM.gif" name="submit" style={{ height: 12 }}/>
                <img alt="" src="https://www.paypalobjects.com/en_GB/i/scr/pixel.gif" width="1" height="1"/>
              </form>
              <br/>
              本網站的原始碼在 MIT 授權下於 <a target="_blank" href="https://git.io/lihkg">GitHub</a> 發佈
            </Modal.Description>
          </Modal.Content>
        </Modal>
        <div style={{ pointerEvents: this.state.drawerOpen ? 'auto' : 'none' }}>
          <VelocityComponent animation={{ opacity: this.state.drawerOpen ? 1 : 0 }} duration={ 250 }>
            <b className="App-drawerOverlay" onClick={ toggleDrawer }/>
          </VelocityComponent>
          <VelocityComponent animation={{ translateX: this.state.drawerOpen ? 0 : '-100%' }} duration={ 250 }>
            { drawer }
          </VelocityComponent>
        </div>
        <main className="App-content">
          { children }
          <Settings ref={ linkRef } { ...this.props }/>
        </main>
        { !this.state.actionHelper ? null : (
          <ul className="App-helper" style={{ left: this.state.actionHelper.x, top: this.state.actionHelper.y }}>
            {
              this.props.app.pageActions.map(action => {
                return <HoverListItem key={ action.id } id={ action.id } x={ this.state.pointerXY.x } y={ this.state.pointerXY.y }>{ action.text }</HoverListItem>
              })
            }
          </ul>
        ) }
      </div>
    )
  }
}

export default connect(
  state => ({
    app: state.app,
  }),
  dispatch => ({
    actions: bindActionCreators(types, dispatch),
  })
)(App)
