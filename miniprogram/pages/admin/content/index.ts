// 管理员端 - 内容管理
const pagePath = 'pages/admin/content/index';

Page({
  data: {
    activeTab: 'banner', // banner, notice, gallery, recommend
    contentList: [] as Array<{
      _id: string;
      type: string;
      title: string;
      content: string;
      images: string[];
      order: number;
      status: string;
      createTime: string;
      // 推荐员工相关字段
      staffIds?: string[];
      staffList?: any[];
    }>,
    tabs: [
      { key: 'banner', label: '轮播图' },
      { key: 'notice', label: '公告' },
      { key: 'gallery', label: '相册' },
      { key: 'recommend', label: '今日推荐' }
    ],
    loading: true,
    showAddModal: false,
    editingContent: null as any,
    staffList: [] as Array<{
      _openid: string;
      nickname: string;
      userId: string;
      avatar?: string;
    }>,
    formData: {
      title: '',
      content: '',
      images: [] as string[],
      order: 0,
      status: 'active',
      // 推荐员工相关字段
      staffIds: [] as string[]
    },
    selectedStaffCount: 0, // 已选择的员工数量
    // 图片 URL 到 fileID 的映射（用于编辑时保存原始 fileID）
    imageUrlToFileIdMap: {} as Record<string, string>
  },

  onLoad() {
    this.loadContent()
    this.loadStaffList()
  },

  // 加载员工列表（用于推荐功能）
  loadStaffList() {
    wx.cloud.callFunction({
      name: 'getUsers',
      data: {
        role: 'Staff',
        page: 1,
        pageSize: 50 // 获取足够多的员工
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          this.setData({
            staffList: res.result.data.users.map((user: any) => ({
              ...user,
              createTime: this.formatTime(user.createTime)
            }))
          })
        }
      },
      fail: (err: any) => {
        console.error('加载员工列表失败:', err)
      }
    })
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    tabBar && tabBar.setSelected && tabBar.setSelected(pagePath);
  },

  onPullDownRefresh() {
    this.loadContent(true)
  },

  // 切换标签
  onTabChange(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      loading: true
    })
    this.loadContent()
  },

  // 加载内容列表
  loadContent(refresh = false) {
    if (!refresh) {
      this.setData({ loading: true })
    }

    wx.cloud.callFunction({
      name: 'getContent',
      data: {
        type: this.data.activeTab
      },
      success: async (res: any) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          // getContent 现在返回对象结构，从中提取指定类型的内容数组
          const data = res.result.data || {}
          const rawContentList = data[this.data.activeTab] || []

          let contentList = rawContentList.map((item: any) => ({
            ...item,
            createTime: this.formatTime(item.createTime)
          }))

          // 转换图片 URL（cloud:// → 临时 URL）
          const fileIDs: string[] = []
          contentList.forEach((item: any) => {
            if (item.images && Array.isArray(item.images)) {
              item.images.forEach((img: string) => {
                if (img && img.startsWith('cloud://')) {
                  fileIDs.push(img)
                }
              })
            }
          })

          // 如果有需要转换的图片
          if (fileIDs.length > 0) {
            try {
              const tempRes = await wx.cloud.getTempFileURL({
                fileList: fileIDs
              })

              const urlMap = new Map<string, string>()
              tempRes.fileList.forEach((f: any) => {
                if (f.status === 0 && f.tempFileURL) {
                  urlMap.set(f.fileID, f.tempFileURL)
                }
              })

              // 替换图片 URL
              contentList = contentList.map((item: any) => {
                if (item.images && Array.isArray(item.images)) {
                  return {
                    ...item,
                    images: item.images.map((img: string) =>
                      img.startsWith('cloud://') ? urlMap.get(img) || img : img
                    )
                  }
                }
                return item
              })
            } catch (e) {
              console.error('管理端图片转换失败:', e)
            }
          }

          this.setData({
            contentList,
            loading: false
          })
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
        }

        if (refresh) {
          wx.stopPullDownRefresh()
        }
      },
      fail: (err: any) => {
        wx.hideLoading()
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 显示添加/编辑模态框
  showAddModal() {
    console.log('显示添加模态框')
    const defaultFormData = this.getDefaultFormData()
    this.setData({
      showAddModal: true,
      editingContent: null,
      formData: defaultFormData,
      selectedStaffCount: defaultFormData.staffIds ? defaultFormData.staffIds.length : 0
    })
  },

  // 编辑内容
  editContent(e: any) {
    const content = e.currentTarget.dataset.content
    console.log('编辑内容:', content)

    // 根据内容类型设置表单数据
    let formData: any = {
      title: content.title || '',
      content: content.content || '',
      images: content.images || [],
      order: content.order || 0,
      status: content.status || 'active'
    }

    // 公告类型不允许图片，清空 images
    if (content.type === 'notice') {
      formData.images = []
    }

    // 如果是推荐内容，加载员工信息
    if (content.type === 'recommend' && content.staffIds) {
      formData.staffIds = content.staffIds
    }

    // 保存原始 fileID 映射（用于保存时还原）
    const urlToFileIdMap: Record<string, string> = {}
    
    // 转换编辑时的图片 URL（如果 images 中有 cloud:// 格式）
    const cloudImages = (formData.images || []).filter((img: string) => img && img.startsWith('cloud://'))
    if (cloudImages.length > 0) {
      wx.cloud.getTempFileURL({
        fileList: cloudImages
      }).then((tempRes: any) => {
        const fileIdToUrlMap = new Map<string, string>()
        tempRes.fileList.forEach((f: any) => {
          if (f.status === 0 && f.tempFileURL) {
            fileIdToUrlMap.set(f.fileID, f.tempFileURL)
            urlToFileIdMap[f.tempFileURL] = f.fileID // 反向映射
          }
        })

        // 替换图片 URL（用于显示）
        formData.images = formData.images.map((img: string) =>
          img.startsWith('cloud://') ? fileIdToUrlMap.get(img) || img : img
        )

        this.setData({
          showAddModal: true,
          editingContent: content,
          formData,
          selectedStaffCount: formData.staffIds ? formData.staffIds.length : 0,
          imageUrlToFileIdMap: urlToFileIdMap
        })
      }).catch((err: any) => {
        console.error('编辑时图片转换失败:', err)
        // 即使转换失败，也显示编辑框
        this.setData({
          showAddModal: true,
          editingContent: content,
          formData,
          selectedStaffCount: formData.staffIds ? formData.staffIds.length : 0,
          imageUrlToFileIdMap: {}
        })
      })
    } else {
      // 没有需要转换的图片，直接显示编辑框
      this.setData({
        showAddModal: true,
        editingContent: content,
        formData,
        selectedStaffCount: formData.staffIds ? formData.staffIds.length : 0,
        imageUrlToFileIdMap: {}
      })
    }
  },

  // 获取默认表单数据（根据当前标签类型）
  getDefaultFormData() {
    const baseData = {
      title: '',
      content: '',
      images: [],
      order: this.data.contentList.length,
      status: 'active'
    }

    // 推荐类型需要特殊的默认数据
    if (this.data.activeTab === 'recommend') {
      return {
        ...baseData,
        staffIds: []
      }
    }

    return baseData
  },

  // 阻止事件冒泡
  preventTap() {
    // 阻止事件冒泡，防止点击弹窗内容时关闭弹窗
  },

  // 隐藏模态框
  hideModal() {
    console.log('隐藏模态框', new Date().toLocaleTimeString())

    // 检查是否有未保存的内容
    const hasContent = this.data.formData.title || this.data.formData.content || this.data.formData.images.length > 0

    if (hasContent) {
      wx.showModal({
        title: '确认关闭',
        content: '内容尚未保存，确定要关闭吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              showAddModal: false,
              editingContent: null
            })
          }
        }
      })
    } else {
      this.setData({
        showAddModal: false,
        editingContent: null
      })
    }
  },

  // 输入框变化
  onInputChange(e: any) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 状态切换
  onStatusChange(e: any) {
    this.setData({
      'formData.status': e.detail.value
    })
  },

  // 上传图片
  uploadImages() {
    console.log('开始上传图片，当前图片数量:', this.data.formData.images.length)
    wx.chooseImage({
      count: 9 - this.data.formData.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        console.log('选择图片成功:', res.tempFilePaths.length)
        wx.showLoading({ title: '上传中...' })
        const uploadPromises = res.tempFilePaths.map((filePath, index) =>
          wx.cloud.uploadFile({
            cloudPath: `content/${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}.jpg`,
            filePath
          })
        )

        Promise.all(uploadPromises).then(async (uploadResults: any[]) => {
          console.log('图片上传成功:', uploadResults.length)
          const newFileIDs = uploadResults.map(result => result.fileID)
          console.log('新图片fileIDs:', newFileIDs)

          // 立即转换新上传的图片为临时 URL，以便在表单中显示
          // 同时更新映射关系
          try {
            const tempRes = await wx.cloud.getTempFileURL({
              fileList: newFileIDs
            })

            const urlToFileIdMap = { ...this.data.imageUrlToFileIdMap }
            const newImages = tempRes.fileList.map((f: any) => {
              if (f.status === 0 && f.tempFileURL) {
                // 更新映射：临时 URL -> fileID
                urlToFileIdMap[f.tempFileURL] = f.fileID
                return f.tempFileURL
              }
              // 如果转换失败，返回原始 fileID
              return f.fileID
            })

            wx.hideLoading()
            this.setData({
              'formData.images': [...this.data.formData.images, ...newImages],
              imageUrlToFileIdMap: urlToFileIdMap
            })
          } catch (err) {
            console.error('图片URL转换失败:', err)
            wx.hideLoading()
            // 即使转换失败，也保存 fileID（保存时会保存 fileID）
            this.setData({
              'formData.images': [...this.data.formData.images, ...newFileIDs]
            })
          }
        }).catch((err) => {
          console.error('上传失败:', err)
          wx.hideLoading()
          wx.showToast({ title: '上传失败', icon: 'none' })
        })
      },
      fail: (err) => {
        console.log('用户取消选择图片或选择失败:', err)
        // 不显示错误提示，因为用户可能只是取消了选择
      }
    })
  },

  // 删除图片
  deleteImage(e: any) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.formData.images]
    images.splice(index, 1)
    this.setData({
      'formData.images': images
    })
  },

  // 选择/取消选择员工（用于推荐功能）
  toggleStaffSelection(e: any) {
    const staffId = e.currentTarget.dataset.staffId
    const currentStaffIds = this.data.formData.staffIds || []
    let newStaffIds: string[]

    if (currentStaffIds.includes(staffId)) {
      // 取消选择
      newStaffIds = currentStaffIds.filter(id => id !== staffId)
    } else {
      // 选择员工（最多选择3个）
      if (currentStaffIds.length >= 3) {
        wx.showToast({ title: '最多只能选择3个员工', icon: 'none' })
        return
      }
      newStaffIds = [...currentStaffIds, staffId]
    }

    this.setData({
      'formData.staffIds': newStaffIds,
      selectedStaffCount: newStaffIds.length
    })
  },

  // 检查员工是否已被选择
  isStaffSelected(staffId: string) {
    return (this.data.formData.staffIds || []).includes(staffId)
  },

  // 保存内容
  saveContent() {
    console.log('开始保存内容', this.data.formData)
    if (!this.validateForm()) {
      console.log('表单验证失败')
      return
    }

    wx.showLoading({ title: '保存中...' })

    const action = this.data.editingContent ? 'update' : 'create'
    
    // 处理图片：保存时需要使用 fileID，而不是临时 URL
    let imagesToSave: string[] = []
    if (this.data.formData.images && Array.isArray(this.data.formData.images)) {
      imagesToSave = this.data.formData.images.map((img: string) => {
        // 如果是 cloud:// 格式，直接使用（这是 fileID，可能是新上传的）
        if (img && img.startsWith('cloud://')) {
          return img
        }
        // 如果是 https:// 临时 URL，从映射中查找对应的 fileID
        if (img && (img.startsWith('https://') || img.startsWith('http://'))) {
          const fileID = this.data.imageUrlToFileIdMap[img]
          if (fileID) {
            return fileID
          }
          // 如果映射中找不到，说明这是新上传后转换的图片
          // 这种情况下，我们需要从上传结果中获取 fileID
          // 但由于上传时我们已经转换了，所以这里应该不会出现这种情况
          console.warn('无法找到临时URL对应的fileID:', img)
          return ''
        }
        return ''
      }).filter((img: string) => img && img.length > 0)
    }

    let data = {
      ...this.data.formData,
      images: imagesToSave, // 使用处理后的 images
      type: this.data.activeTab
    }

    // 对于update操作，id应该作为单独的参数传递
    let updateId = null
    if (this.data.editingContent) {
      updateId = this.data.editingContent._id
    }

    // 公告类型只允许文字，清空图片
    if (this.data.activeTab === 'notice') {
      data.images = []
    }

    // 如果是推荐内容，验证至少选择了一个员工
    if (this.data.activeTab === 'recommend') {
      if (!data.staffIds || data.staffIds.length === 0) {
        wx.showToast({ title: '请至少选择一个推荐员工', icon: 'none' })
        return
      }
    }

    const callData: any = {
      action,
      data
    }

    // 对于update操作，id需要作为顶级参数
    if (updateId) {
      callData.id = String(updateId) // 确保ID是字符串格式
    }

    console.log('调用云函数的参数:', callData)

    wx.cloud.callFunction({
      name: 'updateContent',
      data: callData,
      success: (res: any) => {
        console.log('保存成功响应:', res)
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          this.hideModal()
          this.loadContent(true)
        } else {
          console.error('保存失败:', res.result?.error)
          wx.showToast({
            title: res.result?.error || '保存失败',
            icon: 'none'
          })
        }
      },
      fail: (err: any) => {
        console.error('保存网络错误:', err)
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 删除内容（已废弃，现在使用编辑弹窗中的删除功能）
  // deleteContent(e: any) {
  //   const content = e.currentTarget.dataset.content
  //
  //   wx.showModal({
  //     title: '确认删除',
  //     content: '确定删除该内容吗？此操作不可恢复',
  //     success: (res) => {
  //       if (res.confirm) {
  //         wx.showLoading({ title: '删除中...' })
  //         wx.cloud.callFunction({
  //           name: 'updateContent',
  //           data: {
  //             action: 'delete',
  //             id: content._id
  //           },
  //           success: (res: any) => {
  //             wx.hideLoading()
  //             if (res.result && res.result.success) {
  //               wx.showToast({
  //                 title: '删除成功',
  //                 icon: 'success'
  //               })
  //               this.loadContent()
  //             } else {
  //               wx.showToast({
  //                 title: '删除失败',
  //                 icon: 'none'
  //               })
  //             }
  //           },
  //           fail: (err: any) => {
  //             wx.hideLoading()
  //             console.error('删除失败:', err)
  //             wx.showToast({ title: '网络错误', icon: 'none' })
  //           }
  //         })
  //       }
  //     }
  //   })
  // },

  // 从模态框中删除内容
  deleteContentFromModal() {
    const content = this.data.editingContent

    if (!content) {
      wx.showToast({ title: '没有要删除的内容', icon: 'none' })
      return
    }

    if (!content._id) {
      wx.showToast({ title: '内容ID无效', icon: 'none' })
      console.error('内容没有有效的ID:', content)
      return
    }

    console.log('准备删除内容，ID类型检查:', typeof content._id, '值:', content._id)

    wx.showModal({
      title: '确认删除',
      content: `确定删除"${content.title}"吗？此操作不可恢复`,
      confirmText: '删除',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          console.log('准备删除内容:', content._id, content.title)
          console.log('传递的参数:', { action: 'delete', id: content._id })

          wx.cloud.callFunction({
            name: 'updateContent',
            data: {
              action: 'delete',
              id: String(content._id) // 确保ID是字符串格式
            },
            success: (res: any) => {
              console.log('删除响应:', res)
              wx.hideLoading()
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
                this.hideModal()
                this.loadContent(true)
              } else {
                const errorMsg = res.result?.error || '未知错误'
                console.error('删除失败:', errorMsg)
                wx.showToast({
                  title: `删除失败: ${errorMsg}`,
                  icon: 'none',
                  duration: 3000
                })
              }
            },
            fail: (err: any) => {
              wx.hideLoading()
              console.error('删除失败:', err)
              wx.showToast({ title: '网络错误', icon: 'none' })
            }
          })
        }
      }
    })
  },

  // 表单验证
  validateForm() {
    const { title } = this.data.formData

    // 基础验证
    if (!title || title.trim() === '') {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return false
    }

    if (title.length > 50) {
      wx.showToast({ title: '标题不能超过50个字符', icon: 'none' })
      return false
    }

    // 根据内容类型进行额外验证
    if (this.data.activeTab === 'recommend') {
      if (!this.data.formData.staffIds || this.data.formData.staffIds.length === 0) {
        wx.showToast({ title: '请至少选择一个推荐员工', icon: 'none' })
        return false
      }
      if (this.data.formData.staffIds.length > 3) {
        wx.showToast({ title: '最多只能选择3个员工', icon: 'none' })
        return false
      }
    }

    return true
  },

  // 格式化时间
  formatTime(timeStr: string) {
    const date = new Date(timeStr)
    return date.toLocaleDateString()
  }
})