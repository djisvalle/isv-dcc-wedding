import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuestDashboard } from "./GuestDashboard";
import { InviteDashboard } from "./InviteDashboard";

export default function Dashboard() {    

    return (
        <div className="min-h-screen bg-background p-6 pt-24">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Welcome to the dashboard</p>
                </div>

                <Tabs defaultValue="guest">
                    <TabsList>
                        <TabsTrigger value="guest">Guest Dashboard</TabsTrigger>
                        <TabsTrigger value="invite">Invite Dashboard</TabsTrigger>
                    </TabsList>
                    <TabsContent value="guest">
                        <GuestDashboard />
                    </TabsContent>
                    <TabsContent value="invite">
                        <InviteDashboard />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}