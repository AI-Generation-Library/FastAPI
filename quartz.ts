import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { addFolderLinks } from "./folder-links"
import { addBookFeatures } from "./book-features"

const config = await loadQuartzConfig()
addFolderLinks(config)
addBookFeatures(config)
export default config
export const layout = await loadQuartzLayout()
