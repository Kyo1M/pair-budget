/**
 * 世帯セットアップカード
 * 
 * 世帯に所属していないユーザーに表示するカード。
 * 世帯作成または参加コード入力のアクションを提供します。
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Link2 } from 'lucide-react';
import { CreateHouseholdModal } from '@/components/modals/CreateHouseholdModal';
import { JoinHouseholdModal } from '@/components/modals/JoinHouseholdModal';

/**
 * 世帯セットアップカードコンポーネント
 * 
 * @returns 世帯セットアップカード
 */
export function HouseholdSetupCard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>世帯を始めましょう</CardTitle>
          <CardDescription>
            新しい世帯を作成するか、既存の世帯に参加してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            世帯を作成
          </Button>
          
          <Button
            onClick={() => setIsJoinModalOpen(true)}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Link2 className="mr-2 h-5 w-5" />
            参加コードで参加
          </Button>
        </CardContent>
      </Card>

      <CreateHouseholdModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
      
      <JoinHouseholdModal
        open={isJoinModalOpen}
        onOpenChange={setIsJoinModalOpen}
      />
    </>
  );
}

