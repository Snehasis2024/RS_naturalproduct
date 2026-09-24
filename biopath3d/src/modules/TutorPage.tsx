import { useEffect } from 'react'
import { TutorPanel } from '../components/layout/TutorPanel'
import { useRoute, setParam } from '../store/router'
import { useStore } from '../store/useStore'
import { ENTITY_MAP } from '../data'
import { EntityCard } from '../components/layout/InfoPanel'

export function TutorPage() {
  const { params } = useRoute()
  const select = useStore((s) => s.select)
  const selection = useStore((s) => s.selection)
  const setTutorOpen = useStore((s) => s.setTutorOpen)
  useEffect(() => {
    setTutorOpen(false)
    const about = params.get('about')
    if (about && ENTITY_MAP[about]) {
      select({ kind: ENTITY_MAP[about].kind === 'organelle' ? 'organelle' : 'protein', id: about, label: ENTITY_MAP[about].name })
      setParam('about', null)
    }
  }, [params, select, setTutorOpen])
  const entity = selection ? ENTITY_MAP[selection.id] : undefined
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="min-h-0 flex-1 border-white/10 lg:border-r">
        <TutorPanel embedded />
      </div>
      <div className="scroll-thin max-h-[45vh] overflow-y-auto p-4 lg:max-h-none lg:w-[400px]">
        {entity ? (
          <EntityCard e={entity} />
        ) : (
          <div className="text-sm text-slate-400">
            <div className="section-title mb-2">How BioTutor works</div>
            <p>Offline mode answers only from BioPath’s curated, referenced knowledge base, so it will say when it does not know rather than invent a mechanism. It adapts to Beginner, Intermediate or Advanced level, and it uses whatever you selected in a 3D view as context.</p>
            <p className="mt-2">Claude mode (⚙) lets you use your own Anthropic API key for open-ended questions; answers are grounded with the same knowledge base and your current selection.</p>
          </div>
        )}
      </div>
    </div>
  )
}
