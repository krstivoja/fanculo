import React, { useState, useEffect } from 'react'
import PostList from './PostList'
import TaxonomyTabs from './TaxonomyFilter'
import SearchBox from './SearchBox'
import NewPostButton from './NewPostButton'
import NewPostModal from './NewPostModal'

const Sidebar = () => {
  const [posts, setPosts] = useState([])
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTerm, setSelectedTerm] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [selectedPostType, setSelectedPostType] = useState(null)

  // Fetch taxonomy terms on component mount
  useEffect(() => {
    fetchTaxonomyTerms()
  }, [])

  // Set default selected term when terms are loaded
  useEffect(() => {
    if (terms.length > 0 && !selectedTerm) {
      setSelectedTerm(terms[0].slug)
    }
  }, [terms, selectedTerm])

  // Fetch posts when filters change
  useEffect(() => {
    fetchPosts()
  }, [selectedTerm, searchQuery, currentPage])

  const fetchTaxonomyTerms = async () => {
    try {
      const response = await fetch('/wp-json/funculo/v1/taxonomy-terms', {
        headers: {
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTerms(data.terms)
      }
    } catch (error) {
      console.error('Error fetching taxonomy terms:', error)
    }
  }

  const fetchPosts = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '10',
      })

      if (selectedTerm) {
        params.append('taxonomy_filter', selectedTerm)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/wp-json/funculo/v1/posts?${params}`, {
        headers: {
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts)
        setTotalPages(data.total_pages)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTermFilter = (termSlug) => {
    setSelectedTerm(termSlug)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleNewPost = (postType) => {
    setSelectedPostType(postType)
    setShowNewPostModal(true)
  }

  const handleCloseModal = () => {
    setShowNewPostModal(false)
    setSelectedPostType(null)
  }

  const handlePostCreated = (newPost) => {
    // Switch to the created post's taxonomy term
    if (newPost.terms && newPost.terms.length > 0) {
      setSelectedTerm(newPost.terms[0].slug)
    }
    // Refresh the posts list
    fetchPosts()
    // Refresh taxonomy terms to update counts
    fetchTaxonomyTerms()
  }

  const getTermBadgeClass = (termSlug) => {
    switch (termSlug) {
      case 'blocks':
        return 'term-badge blocks'
      case 'symbols':
        return 'term-badge symbols'
      case 'scss-partials':
        return 'term-badge scss-partials'
      default:
        return 'term-badge'
    }
  }

  return (
    <div className="funculo-sidebar">
      <div className="sidebar-header">
        <div className="header-content">
          <div className="header-info">
            <h3>Funculo Components</h3>
            <p className="total-count">{total} items</p>
          </div>
          <NewPostButton onNewPost={handleNewPost} />
        </div>
      </div>

      <div className="sidebar-filters">
        <SearchBox
          value={searchQuery}
          onSearch={handleSearch}
          placeholder="Search components..."
        />

        <TaxonomyTabs
          terms={terms}
          selectedTerm={selectedTerm}
          onTermSelect={handleTermFilter}
        />
      </div>

      <div className="sidebar-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading components...</p>
          </div>
        ) : (
          <>
            <PostList
              posts={posts}
              getTermBadgeClass={getTermBadgeClass}
            />

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>

                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <NewPostModal
        isOpen={showNewPostModal}
        onClose={handleCloseModal}
        postType={selectedPostType}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}

export default Sidebar