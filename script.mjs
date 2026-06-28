import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes("activeTab === 'rh' ? ("));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes("{/* Member Functions Management Section moved from ADM to RH */}"));

console.log('startIndex:', startIndex);
console.log('endIndex:', endIndex);

const resultsStart = lines.findIndex((l, i) => i > startIndex && l.includes("{/* Resultados */}"));
const resultsEnd = lines.findIndex((l, i) => i > resultsStart && l.includes("</AnimatePresence>"));
console.log('resultsStart:', resultsStart);
console.log('resultsEnd:', resultsEnd);

if (startIndex > -1 && endIndex > -1 && resultsStart > -1 && resultsEnd > -1) {
  const beforeRH = lines.slice(0, startIndex + 1).join('\n');
  const afterRH = lines.slice(endIndex - 1).join('\n');
  
  // Results block
  const resultsBlock = lines.slice(resultsStart, resultsEnd - 2).join('\n');
  
  // Extracting admin filtro card (excluding results)
  const adminFiltroCard = lines.slice(startIndex + 1, resultsStart).join('\n') + '\n                        </div>\n                      </div>\n                    </motion.div>\n                  )}\n                </AnimatePresence>\n              </section>';

  // Constructing the new RH block
  const newRH = `
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-10">
              {appUser?.role === 'admin' ? (
                /* Admin Filtro Card */
${adminFiltroCard.replace(/^/gm, '                ')}
              ) : (
                /* Non-admin filter buttons */
                <section>
                   {rhFilterType === 'all' ? (
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       <button onClick={() => setRhFilterType('relationship')} className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-[#222] flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md hover:border-ibc-teal/50 transition-all active:scale-95">
                          <Users className="w-8 h-8 text-ibc-teal" />
                          <span className="font-bold text-gray-900 dark:text-gray-50 text-sm">Grau de Parentesco</span>
                       </button>
                       <button onClick={() => setRhFilterType('function')} className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-[#222] flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md hover:border-ibc-teal/50 transition-all active:scale-95">
                          <Briefcase className="w-8 h-8 text-ibc-teal" />
                          <span className="font-bold text-gray-900 dark:text-gray-50 text-sm">Função de Membros</span>
                       </button>
                       <button onClick={() => setRhFilterType('age')} className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-[#222] flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md hover:border-ibc-teal/50 transition-all active:scale-95">
                          <Clock className="w-8 h-8 text-ibc-teal" />
                          <span className="font-bold text-gray-900 dark:text-gray-50 text-sm">Classificação por Idade</span>
                       </button>
                       <button onClick={() => setRhFilterType('couples')} className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-[#222] flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md hover:border-ibc-teal/50 transition-all active:scale-95">
                          <Heart className="w-8 h-8 text-ibc-teal" />
                          <span className="font-bold text-gray-900 dark:text-gray-50 text-sm">Casais</span>
                       </button>
                       <button onClick={() => setRhFilterType('families')} className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-[#222] flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md hover:border-ibc-teal/50 transition-all active:scale-95">
                          <Home className="w-8 h-8 text-ibc-teal" />
                          <span className="font-bold text-gray-900 dark:text-gray-50 text-sm">Familiares</span>
                       </button>
                       <button onClick={() => setRhFilterType('birthdays')} className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-[#222] flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md hover:border-ibc-teal/50 transition-all active:scale-95">
                          <Cake className="w-8 h-8 text-ibc-teal" />
                          <span className="font-bold text-gray-900 dark:text-gray-50 text-sm">Aniversariantes</span>
                       </button>
                     </div>
                   ) : (
                     <div className="space-y-6">
                       <button onClick={() => { setRhFilterType('all'); setRhSelectedValue(''); }} className="flex items-center text-sm font-bold text-gray-500 hover:text-ibc-teal transition-colors">
                         <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                       </button>

                       {/* Inner selections for non-admins before showing results */}
                       {rhFilterType === 'relationship' && !rhSelectedValue && (
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                           {relationshipTypes.map(rt => (
                             <button key={rt.id} onClick={() => setRhSelectedValue(rt.name)} className="p-4 bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-2xl font-bold text-gray-900 dark:text-gray-50 text-sm hover:border-ibc-teal hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-all text-left flex justify-between items-center group">
                               <span>{rt.name}</span>
                               <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-ibc-teal" />
                             </button>
                           ))}
                         </div>
                       )}

                       {rhFilterType === 'function' && !rhSelectedValue && (
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                           {memberFunctions.map(f => (
                             <button key={f.id} onClick={() => setRhSelectedValue(f.name)} className="p-4 bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-2xl font-bold text-gray-900 dark:text-gray-50 text-sm hover:border-ibc-teal hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-all text-left flex justify-between items-center group">
                               <span>{f.name}</span>
                               <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-ibc-teal" />
                             </button>
                           ))}
                         </div>
                       )}

                       {rhFilterType === 'age' && !rhSelectedValue && (
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                           {ageClassifications.map(c => (
                             <button key={c.id} onClick={() => setRhSelectedValue(c.id)} className="p-4 bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-2xl font-bold text-gray-900 dark:text-gray-50 text-sm hover:border-ibc-teal hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-all text-left flex justify-between items-center group">
                               <span>{c.name}</span>
                               <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-ibc-teal" />
                             </button>
                           ))}
                         </div>
                       )}

                       {rhFilterType === 'birthdays' && !rhSelectedValue && (
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                           {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                             <button key={i} onClick={() => { setRhBirthdayMonth(i); setRhSelectedValue('selected'); }} className="p-4 bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-2xl font-bold text-gray-900 dark:text-gray-50 text-sm hover:border-ibc-teal hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-all text-left flex justify-between items-center group">
                               <span>{m}</span>
                               <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-ibc-teal" />
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                   )}
                </section>
              )}

              {/* Shared Results section */}
              {((appUser?.role === 'admin' && !isRHFilterCollapsed) || 
                (appUser?.role !== 'admin' && rhFilterType !== 'all' && (rhSelectedValue || rhFilterType === 'couples' || rhFilterType === 'families' || rhFilterType === 'elders'))) && (
                <section className={appUser?.role === 'admin' ? "bg-white dark:bg-[#111] rounded-3xl border-t-0 border border-gray-100 dark:border-[#222] shadow-sm p-4 sm:p-8 -mt-8 pt-10" : "bg-transparent mt-4"}>
${resultsBlock.replace(/^/gm, '                  ')}
                </section>
              )}
            </div>
`;
  
  fs.writeFileSync('src/App.tsx', beforeRH + '\n' + newRH + '\n' + afterRH);
  console.log('App.tsx updated successfully!');
} else {
  console.log('Could not find indices');
}
