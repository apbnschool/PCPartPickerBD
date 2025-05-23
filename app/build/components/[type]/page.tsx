"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import { Filter, Check, Search, Loader2, RefreshCw, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SiteHeader } from "@/components/site-header"
import { AttentionBanner } from "@/components/attention-banner"

interface Component {
  name: string
  price: string
  image: string
  availability: string
  source: string
  url: string
  specs?: Record<string, string>
}

// Map component types to display names
const componentTypeNames: Record<string, string> = {
  cpu: "CPU",
  "cpu-cooler": "CPU Cooler",
  motherboard: "Motherboard",
  memory: "Memory",
  storage: "Storage",
  "video-card": "Video Card",
  case: "Case",
  "power-supply": "Power Supply",
  "operating-system": "Operating System",
  monitor: "Monitor",
}

// Function to handle price display
const renderPrice = (price: string) => {
  // Check if price contains multiple prices (e.g., "৳ 12,500 ৳ 13,000")
  if (price.includes("৳") && price.split("৳").length > 2) {
    const prices = price.split("৳").filter((p) => p.trim())

    // If we have at least two prices
    if (prices.length >= 2) {
      return (
        <div>
          <p className="text-lg font-bold">৳{prices[0].trim()}</p>
          <p className="text-sm text-muted-foreground line-through">৳{prices[1].trim()}</p>
        </div>
      )
    }
  }

  // Regular price display
  return <p className="text-lg font-bold">{price}</p>
}

// Extract the component card to a separate function to avoid code duplication
const ComponentCard = ({
  component,
  displayName,
  onSelect,
}: {
  component: Component
  displayName: string
  onSelect: (component: Component) => void
}) => {
  return (
    <div
      className="bg-background border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(component)}
    >
      <div className="relative h-[200px] bg-white">
        {component.image ? (
          <Image src={component.image || "/placeholder.svg"} alt={component.name} fill className="object-contain p-4" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">No image</div>
        )}
        {component.availability === "In Stock" && (
          <div className="absolute top-2 right-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs px-1.5 py-0.5 rounded">
            In Stock
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge
            variant={component.source === "Startech" ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            <div
              className={`h-4 w-4 rounded ${
                component.source === "Startech"
                  ? "bg-blue-900"
                  : component.source === "Techland"
                    ? "bg-gray-900"
                    : component.source === "UltraTech"
                      ? "bg-purple-900"
                      : component.source === "Potaka IT"
                        ? "bg-green-900"
                        : "bg-red-900"
              } flex items-center justify-center text-white text-[10px]`}
            >
              {component.source === "Startech"
                ? "ST"
                : component.source === "Techland"
                  ? "TL"
                  : component.source === "UltraTech"
                    ? "UT"
                    : component.source === "Potaka IT"
                      ? "PI"
                      : "PC"}
            </div>
            {component.source}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium line-clamp-2 mb-2">{component.name}</h3>

        {/* Display specs if available */}
        {component.specs && Object.keys(component.specs).length > 0 && (
          <div className="mb-2 text-xs text-muted-foreground">
            {Object.entries(component.specs).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span>{key}:</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}

        {renderPrice(component.price)}

        <Button className="w-full mt-2">Select {displayName}</Button>
      </div>
    </div>
  )
}

export default function ComponentSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const type = params.type as string
  const displayName = componentTypeNames[type] || type

  const [components, setComponents] = useState<Component[]>([])
  const [filteredComponents, setFilteredComponents] = useState<Component[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [selectedAvailability, setSelectedAvailability] = useState<string | null>(null)
  const [availableSources, setAvailableSources] = useState<string[]>([])

  // Initial data fetch
  useEffect(() => {
    fetchComponents()
  }, [type])

  // Function to fetch components with optional search query
  const fetchComponents = async (query?: string) => {
    try {
      setLoading(true)
      setError("")

      let url = `/api/components?type=${type}`
      if (query) {
        url += `&search=${encodeURIComponent(query)}`
      }

      // Increase timeout to 60 seconds for complex searches
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60000), // Increase timeout to 60 seconds
      }).catch((error) => {
        console.error("Error fetching components:", error)
        throw new Error("Network error while fetching components. Please try again.")
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()
      const componentsData = data.components || []
      setComponents(componentsData)

      // Extract available sources for filters
      const sources = Array.from(new Set(componentsData.map((comp: Component) => comp.source)))
      setAvailableSources(sources)

      // Apply any existing filters to the new data
      applyFilters(componentsData)
    } catch (err) {
      console.error("Error fetching components:", err)
      setError(err instanceof Error ? err.message : "Failed to load components. Please try again later.")
      setFilteredComponents([])
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  // Replace the applyFilters function with this enhanced version that prioritizes exact matches
  const applyFilters = (componentsToFilter: Component[]) => {
    let result = [...componentsToFilter]

    // Apply source filter
    if (selectedSource) {
      result = result.filter((component) => component.source === selectedSource)
    }

    // Apply availability filter
    if (selectedAvailability) {
      result = result.filter((component) => component.availability === selectedAvailability)
    }

    // If there's a search query, prioritize exact matches
    if (searchQuery.trim()) {
      // Sort results to prioritize exact matches
      result = prioritizeExactMatches(result, searchQuery)
    }

    setFilteredComponents(result)
  }

  // Add this new function to prioritize exact matches
  const prioritizeExactMatches = (components: Component[], query: string): Component[] => {
    const normalizedQuery = query.toLowerCase().trim()

    // Group components into categories based on match quality
    const exactMatches: Component[] = []
    const startsWithMatches: Component[] = []
    const containsMatches: Component[] = []
    const otherMatches: Component[] = []

    // Create a map to track sources we've seen for exact matches
    const sourcesWithExactMatches = new Set<string>()

    // First pass: find exact matches and track their sources
    components.forEach((component) => {
      const normalizedName = component.name.toLowerCase()

      // Check for exact match (ignoring case)
      if (normalizedName === normalizedQuery) {
        exactMatches.push(component)
        sourcesWithExactMatches.add(component.source)
      }
    })

    // Second pass: categorize remaining components
    components.forEach((component) => {
      // Skip components already in exactMatches
      if (exactMatches.includes(component)) {
        return
      }

      const normalizedName = component.name.toLowerCase()

      // Prioritize components from sources that don't have an exact match yet
      if (normalizedName === normalizedQuery && !sourcesWithExactMatches.has(component.source)) {
        exactMatches.push(component)
        sourcesWithExactMatches.add(component.source)
      }
      // Check if component name starts with the query
      else if (normalizedName.startsWith(normalizedQuery)) {
        startsWithMatches.push(component)
      }
      // Check if component name contains the query
      else if (normalizedName.includes(normalizedQuery)) {
        containsMatches.push(component)
      }
      // All other matches (matched by API but not by name)
      else {
        otherMatches.push(component)
      }
    })

    // Combine all groups in priority order
    return [...exactMatches, ...startsWithMatches, ...containsMatches, ...otherMatches]
  }

  // Apply filters when filter selections change
  useEffect(() => {
    applyFilters(components)
  }, [selectedSource, selectedAvailability, components, searchQuery])

  // Handle search submission
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      // If search is empty, just fetch regular components
      fetchComponents()
      return
    }

    setSearching(true)
    fetchComponents(searchQuery)
  }

  const handleSelectComponent = (component: Component) => {
    // Get current build from localStorage
    const currentBuildStr = localStorage.getItem("pcBuild")
    const currentBuild = currentBuildStr ? JSON.parse(currentBuildStr) : {}

    // Update the build with the selected component
    currentBuild[type] = component

    // Save updated build to localStorage
    localStorage.setItem("pcBuild", JSON.stringify(currentBuild))

    // Navigate back to build page
    router.push("/build")
  }

  // Component skeleton for loading state
  const ComponentSkeleton = () => (
    <div className="bg-background border rounded-lg overflow-hidden">
      <div className="relative h-[200px] bg-white">
        <Skeleton className="absolute top-2 left-2 h-6 w-20" />
        <Skeleton className="absolute top-2 right-2 h-5 w-16" />
        <Skeleton className="h-full w-full opacity-30" />
      </div>
      <div className="p-4">
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-3/4 mb-4" />

        {/* Specs skeleton */}
        <div className="mb-2">
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-2/3 mb-3" />
        </div>

        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-9 w-full mt-2" />
      </div>
    </div>
  )

  // Replace the existing header code with:
  return (
    <div className="min-h-screen">
      <AttentionBanner />
      <SiteHeader />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h1 className="text-2xl font-bold">Select a {displayName}</h1>
            <Button
              variant="outline"
              onClick={() => router.push("/build")}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Build Page
            </Button>
          </div>
          <p className="text-muted-foreground">
            Browse and compare {displayName.toLowerCase()} options from different retailers
          </p>
        </div>

        <div className="grid md:grid-cols-[250px_1fr] gap-6">
          {/* Filters sidebar */}
          <div className="bg-card p-4 rounded-lg shadow-sm h-fit">
            <h2 className="font-semibold text-lg mb-4 flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </h2>

            <div className="mb-4">
              <h3 className="font-medium mb-2">Search</h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder={`Search ${displayName}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pr-8"
                    disabled={loading || searching}
                  />
                  {searching && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Button onClick={handleSearch} disabled={loading || searching} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-medium mb-2">Source</h3>
              <div className="space-y-2">
                <Button
                  variant={selectedSource === null ? "default" : "outline"}
                  size="sm"
                  className="mr-2"
                  onClick={() => setSelectedSource(null)}
                  disabled={loading}
                >
                  All
                  {selectedSource === null && <Check className="ml-2 h-3 w-3" />}
                </Button>

                {availableSources.includes("Startech") && (
                  <Button
                    variant={selectedSource === "Startech" ? "default" : "outline"}
                    size="sm"
                    className="mr-2"
                    onClick={() => setSelectedSource("Startech")}
                    disabled={loading}
                  >
                    Startech
                    {selectedSource === "Startech" && <Check className="ml-2 h-3 w-3" />}
                  </Button>
                )}

                {availableSources.includes("Techland") && (
                  <Button
                    variant={selectedSource === "Techland" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSource("Techland")}
                    disabled={loading}
                  >
                    Techland
                    {selectedSource === "Techland" && <Check className="ml-2 h-3 w-3" />}
                  </Button>
                )}

                {availableSources.includes("UltraTech") && (
                  <Button
                    variant={selectedSource === "UltraTech" ? "default" : "outline"}
                    size="sm"
                    className="mr-2"
                    onClick={() => setSelectedSource("UltraTech")}
                    disabled={loading}
                  >
                    UltraTech
                    {selectedSource === "UltraTech" && <Check className="ml-2 h-3 w-3" />}
                  </Button>
                )}

                {availableSources.includes("Potaka IT") && (
                  <Button
                    variant={selectedSource === "Potaka IT" ? "default" : "outline"}
                    size="sm"
                    className="mr-2"
                    onClick={() => setSelectedSource("Potaka IT")}
                    disabled={loading}
                  >
                    Potaka IT
                    {selectedSource === "Potaka IT" && <Check className="ml-2 h-3 w-3" />}
                  </Button>
                )}

                {availableSources.includes("PC House") && (
                  <Button
                    variant={selectedSource === "PC House" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSource("PC House")}
                    disabled={loading}
                  >
                    PC House
                    {selectedSource === "PC House" && <Check className="ml-2 h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Availability</h3>
              <div className="space-y-2">
                <Button
                  variant={selectedAvailability === null ? "default" : "outline"}
                  size="sm"
                  className="mr-2"
                  onClick={() => setSelectedAvailability(null)}
                  disabled={loading}
                >
                  All
                  {selectedAvailability === null && <Check className="ml-2 h-3 w-3" />}
                </Button>
                <Button
                  variant={selectedAvailability === "In Stock" ? "default" : "outline"}
                  size="sm"
                  className="mr-2"
                  onClick={() => setSelectedAvailability("In Stock")}
                  disabled={loading}
                >
                  In Stock
                  {selectedAvailability === "In Stock" && <Check className="ml-2 h-3 w-3" />}
                </Button>
                <Button
                  variant={selectedAvailability === "Out of Stock" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedAvailability("Out of Stock")}
                  disabled={loading}
                >
                  Out of Stock
                  {selectedAvailability === "Out of Stock" && <Check className="ml-2 h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Components list */}
          <div>
            {loading ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array(9)
                    .fill(0)
                    .map((_, index) => (
                      <ComponentSkeleton key={index} />
                    ))}
                </div>
                <div className="text-center mt-6 text-muted-foreground text-sm">
                  <p>Loading components and checking availability...</p>
                  <p className="text-xs mt-1">This may take a moment as we check each product's availability</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-card rounded-lg p-6">
                <p className="text-red-500 mb-4">{error}</p>
                <p className="text-muted-foreground mb-6">
                  There was a problem fetching components. This could be due to network issues or temporary
                  unavailability of some retailer websites.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={() => fetchComponents()} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/build")}>
                    Return to Build Page
                  </Button>
                </div>
              </div>
            ) : filteredComponents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No components found matching your filters.</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedSource(null)
                    setSelectedAvailability(null)
                    fetchComponents()
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredComponents.length} {filteredComponents.length === 1 ? "result" : "results"}
                  </p>
                  {searchQuery && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      Search: {searchQuery}
                    </Badge>
                  )}
                </div>

                {/* Group components by match type when searching */}
                {searchQuery ? (
                  <>
                    {/* Exact Matches Section */}
                    {filteredComponents.some((c) => c.name.toLowerCase() === searchQuery.toLowerCase()) && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Exact Matches</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredComponents
                            .filter((c) => c.name.toLowerCase() === searchQuery.toLowerCase())
                            .map((component, index) => (
                              <ComponentCard
                                key={`exact-${component.source}-${index}`}
                                component={component}
                                displayName={displayName}
                                onSelect={handleSelectComponent}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Similar Matches Section */}
                    {filteredComponents.some(
                      (c) =>
                        c.name.toLowerCase().startsWith(searchQuery.toLowerCase()) &&
                        c.name.toLowerCase() !== searchQuery.toLowerCase(),
                    ) && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Similar Matches</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredComponents
                            .filter(
                              (c) =>
                                c.name.toLowerCase().startsWith(searchQuery.toLowerCase()) &&
                                c.name.toLowerCase() !== searchQuery.toLowerCase(),
                            )
                            .map((component, index) => (
                              <ComponentCard
                                key={`similar-${component.source}-${index}`}
                                component={component}
                                displayName={displayName}
                                onSelect={handleSelectComponent}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Other Related Results */}
                    {filteredComponents.some(
                      (c) =>
                        !c.name.toLowerCase().startsWith(searchQuery.toLowerCase()) &&
                        c.name.toLowerCase() !== searchQuery.toLowerCase(),
                    ) && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 pb-2 border-b">Other Related Results</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredComponents
                            .filter(
                              (c) =>
                                !c.name.toLowerCase().startsWith(searchQuery.toLowerCase()) &&
                                c.name.toLowerCase() !== searchQuery.toLowerCase(),
                            )
                            .map((component, index) => (
                              <ComponentCard
                                key={`related-${component.source}-${index}`}
                                component={component}
                                displayName={displayName}
                                onSelect={handleSelectComponent}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Regular display when not searching
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredComponents.map((component, index) => (
                      <ComponentCard
                        key={`${component.source}-${index}`}
                        component={component}
                        displayName={displayName}
                        onSelect={handleSelectComponent}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
