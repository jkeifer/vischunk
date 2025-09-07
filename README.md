# vischunk: a multi-dimensional data linearization visualizer

An interactive web-based tool for exploring how different chunking and
linearization strategies affect data access patterns in multidimensional
arrays. This visualization helps understand the trade-offs between different
storage layouts and their impact on read performance.

> [!NOTE]
> This project was heavily vibe-coded with claude. YMMV

## 🌐 Live Demo

[View the interactive visualization](https://jkeifer.github.io/vischunk/)

## ✨ Features

### Linearization Algorithms

- **Row-Major**: Traditional C-style array ordering
- **Column-Major**: Fortran-style array ordering
- **Z-Order (Morton)**: Space-filling curve for spatial locality
- **Hilbert Curve**: Optimal space-filling curve for 2D locality

### Interactive Visualizations

- **Logical Array View**: Shows cell linearization within chunks with
  color-coded ordering
- **Chunked Array View**: Displays chunk-level organization and linearization
- **Linear Storage Views**: Both cell-level and chunk-colored representations
  of how data is stored linearly
- **Cross-view Highlighting**: Hover over any view to see corresponding
  elements highlighted in all other views

### Real-time Metrics

- **Cells Requesteds**: How many cells are in the query
- **Cells Read**: How many cells have to be read to fulfill the query (due to
  chunking)
- **Read Amplification**: How much extra data needs to be read due to chunking
- **Read Efficiency**: Percentage of useful data in each read operation
- **Chunks Touched**: How many chunks intersect with the query region
- **Range Reads**: Number of separate read operations required
- **Coalescing Factor**: How much read coalescing improves I/O efficiency
  compared to worst-case (chunks touched ÷ range reads)
- **Storage Alignment**: Overall measure of how well your query aligns with the
  storage layout, combining read efficiency and coalescing.

## 🎮 How to Use

1. **Configure Array Settings**: Set the dimensions of your multidimensional
   array -- some interesting presets are provided.
2. **Configure Chunk Settings**: Define how the array should be divided into
   chunks
3. **Set Query Region**: Define the region of interest you want to read
4. **Explore Algorithms**: Try different linearization strategies and observe
   their effects
5. **Interactive Exploration**: Hover over any visualization to see
   cross-highlighted relationships

## 🔧 Understanding the Visualizations

### Color Coding

- **Green to Red Gradient**: Shows linearization order (green = first, red =
  last)
- **Blue Highlights**: Query regions and cells that need to be read
- **White Overlays**: Currently hovered elements with outlines for direct
  hovers

### Layout Views

- **Left Panel**: Shows the logical array structure and how cells are
  linearized within chunks
- **Right Panel**: Shows the chunk-level organization and how chunks are
  linearized
- **Bottom Linear Views**: Show how the data is actually stored in linear
  memory

### Performance Insights

The metrics panel shows the efficiency implications of your choices:

- Lower read amplification = better performance
- Fewer byte ranges = fewer I/O operations
- Higher efficiency = less wasted bandwidth

## 🎯 Use Cases

- **Database Systems**: Understanding how spatial indexes and chunking affect
  query performance
- **Scientific Computing**: Optimizing array storage for different access
  patterns
- **Image Processing**: Choosing optimal tile layouts for different operations
- **Data Analytics**: Understanding how data layout affects scan performance
- **Education**: Teaching concepts of data structures, spatial locality, and
  storage optimization

## 🤝 Contributing

Interested in contributing? Check out our [CONTRIBUTING.md](CONTRIBUTING.md)
for detailed development setup, testing guidelines, and contribution workflow.

## 📄 License

MIT License - feel free to use this for educational or commercial purposes.

## Pronouncing "vischunk"

Like any other aiming-to-be-trendy new age software gobbledygook, this `README`
would not be complete without a pronunciation guide. So here it is.

"Vischunk" is pronounced as "vie-chunk". The first syllable is the same as that
in the four rank British peerage title "viscount". Because obviously.
