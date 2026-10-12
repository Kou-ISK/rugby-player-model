import type {StandaloneBPacket,BTextReference,BAssessment} from './b-standalone';
import type {ProposalPackage,ProposalRun,ContentRef} from './proposal-types';
export type ImportedProposal={localCandidateId:string;proposalId:string;revision:number;manifestSha256:string;status:'import-inert';package:ProposalPackage;decisions:{A:'pending'|'approved'|'rejected';B:'pending'|'approved'|'rejected'};runs:{run:ProposalRun;matches:boolean|null}[]};
export type PublicExport={candidateId:string;candidateRevision:number;scopeHash:string;package:ProposalPackage};
export type ArtifactLink={target:'A'|'B';localVersion:string;artifact:ContentRef;proposalId:string;manifestSha256:string;runId:string};
export type LegacyStandaloneBReview={id:string;at:string;kind:'b-standalone-review';bVersion:string;inputSha256:string;packet:unknown;model:string;output:string;assessment:string;status:'unverified-external-or-manual-response';humanValidated:false};

export type StandaloneBReview=LegacyStandaloneBReview|{id:string;at:string;kind:'b-standalone-review';formatVersion:2;arm:StandaloneBPacket['arm'];bVersion:string|null;documentRef:BTextReference|null;inputSha256:string;packetSha256:string;packet:StandaloneBPacket;model:string;output:string;assessment:BAssessment;status:'unverified-external-or-manual-response';humanValidated:false};
