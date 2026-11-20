import { app, InvocationContext, Timer } from '@azure/functions';

export async function demoTimerHandler(
    myTimer: Timer, 
    context: InvocationContext,
): Promise<void> {
    const timestamp = new Date().toISOString();
    context.log(`Demo Timer function executed at: ${timestamp}`);

    if (myTimer.isPastDue) {
        context.log('The timer is running late!');
    }
}

app.timer('demoTimerHandler', {
    schedule: '0 */5 * * * *',
    handler: demoTimerHandler,
});