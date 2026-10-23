import discoverForm from './discover-form'
import history from './history'

// Only /api/* reaches the Worker (`run_worker_first` in wrangler.jsonc); every
// other path is a static asset, served without running any code.
export default {
  fetch(req, env) {
    switch (new URL(req.url).pathname) {
      case '/api/discover-form':
        return discoverForm(req)
      case '/api/history':
        return history(req, env.DB)
      default:
        return Response.json({ error: 'not found' }, { status: 404 })
    }
  },
} satisfies ExportedHandler<Env>
