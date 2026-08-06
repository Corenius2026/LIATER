const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Función auxiliar para extraer el tema después del guion
function getAgendaFromTitle(title) {
    if (!title) return 'Sesión general';
    const parts = title.split('-');
    if (parts.length > 1) {
        return parts.slice(1).join('-').trim(); // Toma todo después del primer guion
    }
    return title.trim();
}

// Función auxiliar para limpiar números de teléfono
function cleanPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    // Si no tiene código de país (ej. Colombia empieza por 3 y tiene 10 dígitos)
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
        cleaned = '57' + cleaned; // Asumimos Colombia por defecto si es local, ajusta según necesidad
    }
    return cleaned + '@c.us'; // Formato requerido por whatsapp-web.js para chats individuales
}

// Función auxiliar para formatear la hora (ej: 7:00 PM)
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

async function startCronJobs(whatsappClient) {
    // Ejecutar cada 15 minutos
    cron.schedule('*/15 * * * *', async () => {
        console.log('--- Ejecutando revisión de clases próximas (Cron 15 min) ---');
        
        try {
            // Calcular ventana de tiempo: Clases que empiezan entre 9 horas 45 mins y 10 horas desde AHORA
            const now = new Date();
            const startWindow = new Date(now.getTime() + (9 * 60 * 60 * 1000) + (45 * 60 * 1000));
            const endWindow = new Date(now.getTime() + (10 * 60 * 60 * 1000));
            
            console.log(`Buscando clases entre ${startWindow.toISOString()} y ${endWindow.toISOString()}`);

            // 1. Buscar clases en ese rango
            const { data: classes, error } = await supabase
                .from('class_sessions')
                .select(`
                    id, 
                    title, 
                    class_date, 
                    program_id,
                    teacher_profiles (name, bio)
                `)
                .gte('class_date', startWindow.toISOString())
                .lte('class_date', endWindow.toISOString());

            if (error) throw error;

            if (!classes || classes.length === 0) {
                console.log('No hay clases próximas en la ventana de 10 horas.');
                return;
            }

            console.log(`¡Se encontraron ${classes.length} clases! Procesando envíos...`);

            for (const cls of classes) {
                // 2. Obtener el programa para sacar el título y el whatsapp_group_id
                let programTitle = 'tu programa';
                let groupId = null;

                if (cls.program_id) {
                    const { data: prog } = await supabase
                        .from('diploma_programs')
                        .select('title, whatsapp_group_id')
                        .eq('id', cls.program_id)
                        .single();
                    
                    if (prog) {
                        programTitle = prog.title;
                        groupId = prog.whatsapp_group_id;
                    }
                }

                const classTime = formatTime(cls.class_date);

                // --- MENSAJE PARA EL PROFESOR ---
                if (cls.teacher_profiles && cls.teacher_profiles.bio) {
                    try {
                        const bioData = JSON.parse(cls.teacher_profiles.bio);
                        const phone = bioData.phone;
                        
                        if (phone) {
                            const teacherChatId = cleanPhoneNumber(phone);
                            const teacherMsg = `Hola, Profesor. ${cls.teacher_profiles.name}. 🎓 Le recordamos que tiene programada una clase del programa ${programTitle} en aproximadamente 10 horas. (Hora programada: ${classTime}). ¡Mucho éxito en tu sesión!`;
                            
                            console.log(`Enviando WhatsApp a Profesor: ${teacherChatId}`);
                            await whatsappClient.sendMessage(teacherChatId, teacherMsg);
                        } else {
                            console.log(`El profesor ${cls.teacher_profiles.name} no tiene teléfono registrado.`);
                        }
                    } catch (e) {
                        console.error('Error parseando bio del profesor:', e.message);
                    }
                }

                // --- MENSAJE PARA EL GRUPO ---
                if (groupId) {
                    const agendaTema = getAgendaFromTitle(cls.title);
                    const groupMsg = `¡Hola a todos! 📚 Les recordamos que en 10 horas daremos inicio a nuestra próxima sesión. 🗓️ Agenda de la sesión:\n\n- ${agendaTema}\n\n ¡Los esperamos!`;
                    
                    // Asegurar formato de grupo (@g.us)
                    const groupChatId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
                    
                    console.log(`Enviando WhatsApp al Grupo: ${groupChatId}`);
                    await whatsappClient.sendMessage(groupChatId, groupMsg);
                } else {
                    console.log('No hay whatsapp_group_id configurado para este programa.');
                }
            }

        } catch (error) {
            console.error('Error en el cron job:', error.message);
        }
    });
}

module.exports = { startCronJobs };
