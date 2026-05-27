Component({
  data: {
    selected: 0,
    list: [
      {
        key: 'fridge',
        path: '/pages/index/index',
        text: '冰箱',
      },
      {
        key: 'calendar',
        path: '/pages/calendar/calendar',
        text: '日历',
      },
      {
        key: 'recipe',
        path: '/pages/recipes/recipes',
        text: '菜谱',
      },
    ],
  },

  methods: {
    switchTab(event) {
      const { path, index } = event.currentTarget.dataset

      if (index === this.data.selected) {
        return
      }

      wx.switchTab({
        url: path,
      })
    },
  },
})
